// app/api/crawl/route.js
import puppeteer from 'puppeteer';
import { NextResponse } from 'next/server';

// 👇 Ensures this route runs in the Node.js runtime (not Edge),
// because Puppeteer needs full Node APIs.
export const runtime = 'nodejs';

/**
 * POST /api/crawl
 * Body: { "startUrl": "https://example.com", "maxPages": 10 }
 */
export async function POST(request) {
  try {
    // ─── 1. Validate request body ───────────────────────────────────────────────
    const { startUrl, maxPages = 10 } = await request.json();

    if (
      !startUrl ||
      typeof startUrl !== 'string' ||
      !/^https?:\/\//i.test(startUrl)
    ) {
      return NextResponse.json(
        { error: 'Invalid or missing “startUrl”.' },
        { status: 400 }
      );
    }

    // ─── 2. Initialise crawler state ────────────────────────────────────────────
    const visited = new Set();
    const toVisit = [startUrl];
    const metadataList = [];
    const baseDomain = new URL(startUrl).hostname;

    // ─── 3. Launch Puppeteer ────────────────────────────────────────────────────
    const browser = await puppeteer.launch({
      headless: true,
      // These flags help when you deploy to most serverless hosts
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // ─── 4. Crawl loop ──────────────────────────────────────────────────────────
    while (toVisit.length && visited.size < maxPages) {
      const currentUrl = toVisit.shift();
      if (visited.has(currentUrl)) continue;

      try {
        await page.goto(currentUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 15_000,
        });
        visited.add(currentUrl);

        // --- Extract meta data inside the page -------------------------------
        const meta = await page.evaluate(() => {
          const metaTags = Array.from(document.getElementsByTagName('meta'));
          const metaObj = {};
          metaTags.forEach((tag) => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');
            if (name && content) metaObj[name] = content;
          });
          return { title: document.title, meta: metaObj };
        });

        metadataList.push({ url: currentUrl, ...meta });

        // --- Collect internal links ------------------------------------------
        const links = await page.$$eval('a[href]', (anchors) =>
          anchors.map((a) => a.href).filter((href) => href.startsWith('http'))
        );

        links.forEach((link) => {
          try {
            const hostname = new URL(link).hostname;
            if (
              hostname === baseDomain &&
              !visited.has(link) &&
              !toVisit.includes(link)
            ) {
              toVisit.push(link);
            }
          } catch {
            /* ignore malformed URLs */
          }
        });
      } catch (err) {
        console.warn(`⚠️  Failed to load ${currentUrl}: ${err.message}`);
      }
    }

    // ─── 5. Clean up & respond ────────────────────────────────────────────────
    await browser.close();
    return NextResponse.json({ pages: metadataList });
  } catch (err) {
    console.error('❌  Unexpected server error:', err);
    return NextResponse.json({ error: 'Internal server error'
    }, { status: 500 });
  } 
}