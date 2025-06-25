"use client";

import { useState } from "react";
import DownloadCSVButton from "./components/DownloadCSVButton";

/* ── helper: try to count <loc> tags in /sitemap.xml ─────────────── */
async function getPageCountFromSitemap(url) {
  try {
    const domain = new URL(url).origin;
    const res = await fetch(`${domain}/sitemap.xml`);
    if (!res.ok) return null;

    const text = await res.text();
    const matches = text.match(/<loc>/g);
    return matches ? matches.length : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [startUrl, setStartUrl] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  /* ── form submit: run crawler ──────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startUrl, maxPages: Number(maxPages) }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Request failed");
      }
      const data = await res.json();
      setResult(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🕵️ Website Metadata Scraper
        </h1>

        {/* ── form ─────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded p-6 mb-6 space-y-4"
        >
          {/* URL input */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Start URL
            </label>
            <input
              type="url"
              required
              value={startUrl}
              onChange={(e) => setStartUrl(e.target.value)}
              onBlur={async () => {
                if (!startUrl.startsWith("http")) return;
                const count = await getPageCountFromSitemap(startUrl);
                if (count) setMaxPages(count);
              }}
              className="w-full border border-gray-300 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring focus:border-blue-400 text-gray-700"
              placeholder="https://example.com"
            />
          </div>

          {/* max pages */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Max Pages
            </label>
            <input
              type="number"
              min="1"
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              className="w-24 border border-gray-300 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring focus:border-blue-400 text-gray-700"
            />
          </div>

          {/* submit button with spinner */}
          <button
            type="submit"
            disabled={loading}
            className={`relative px-8 py-2 text-white font-semibold rounded ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {loading ? "Crawling…" : "Start Crawl"}
          </button>

          {error && <p className="text-red-600 mt-2 font-medium">⚠️ {error}</p>}
        </form>

        {/* ── results table ────────────────────────────────────── */}
        {result && (
          <div className="bg-white shadow-md rounded p-6">
            <h2 className="text-xl text-gray-700 font-semibold mb-4">
              ✅ Found {result.length} page{result.length > 1 ? "s" : ""}
            </h2>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full bg-white border border-gray-200 text-gray-700 rounded shadow-sm text-sm">
                <thead className="bg-gray-100 font-semibold">
                  <tr>
                    <th className="px-4 py-2 border text-left">URL</th>
                    <th className="px-4 py-2 border text-left">Title</th>
                    <th className="px-4 py-2 border text-left">
                      Meta keywords
                    </th>
                    <th className="px-4 py-2 border text-left">
                      Meta Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.map((page, i) => (
                    <tr key={i} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-2 border text-blue-700 break-words text-left">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {page.url}
                        </a>
                      </td>
                      <td className="px-4 py-2 border text-left">
                        {page.title || "—"}
                      </td>
                      <td className="px-4 py-2 border text-left">
                        {page.meta?.keywords || "—"}
                      </td>
                      <td className="px-4 py-2 border text-left">
                        {page.meta?.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* download csv */}
            <div className="flex justify-end mt-4">
              <DownloadCSVButton data={result} filename="metadata.csv" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
