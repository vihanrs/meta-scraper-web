import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/sitemap-count
 * Body: { url: string }
 * Returns: { count: number|null, error?: string }
 */
export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid or missing URL.' }, { status: 400 });
    }
    const domain = new URL(url).origin;
    const res = await fetch(`${domain}/sitemap.xml`);
    if (!res.ok) {
      return NextResponse.json({ count: null, error: 'Sitemap not found.' }, { status: 404 });
    }
    const text = await res.text();
    const matches = text.match(/<loc>/g);
    return NextResponse.json({ count: matches ? matches.length : null });
  } catch (err) {
    return NextResponse.json({ count: null, error: 'Server error.' }, { status: 500 });
  }
} 