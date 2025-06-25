"use client";

export default function DownloadCSVButton({ data, filename = "results.csv" }) {
  const handleDownload = () => {
    if (!data?.length) return;

    const headers = ["URL", "Title", "Meta keywords", "Meta description"];
    const rows = data.map((p) => [
      p.url,
      p.title ?? "",
      p.meta?.keywords ?? "",
      p.meta?.description ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: filename,
    });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded shadow"
    >
      ⬇ Download CSV
    </button>
  );
}
