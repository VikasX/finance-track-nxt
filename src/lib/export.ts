/*
 * src/lib/export.ts
 * Creates PDF, ZIP, and Excel-compatible XML downloads from rows supplied by pages. It uses jsPDF/fflate and the download helper, without requesting new financial data itself.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Use the existing document/ZIP dependency for browser exports instead of adding a new service or library.
import { jsPDF } from "jspdf";
// Use the existing document/ZIP dependency for browser exports instead of adding a new service or library.
import { strToU8, zipSync } from "fflate";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { downloadFile } from "./finance";

// Lay out supplied rows in a PDF, wrapping long text and adding pages as needed. The document is a personal summary, not an official tax/bank certificate.
export function reportPDF(title: string, rows: (string | number)[][]) {
  const pdf = new jsPDF();
  pdf.setFontSize(20);
  pdf.setTextColor(99, 14, 212);
  pdf.text("FinTrack", 16, 20);
  pdf.setFontSize(14);
  pdf.setTextColor(25, 28, 30);
  pdf.text(title, 16, 32);
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 110);
  pdf.text(
    "Personal finance summary - not an official bank or tax certificate",
    16,
    41,
  );
  let y = 55;
  rows.forEach((row) => {
    // Prepare text by transforming each source item. map returns a new array; the response records remain available in their original shape.
    const text = row
      .map((cell) =>
        String(cell)
          .replaceAll("₹", "Rs ")
          .replace(/[^\x20-\x7E]/g, " "),
      )
      .join("  |  ");
    const lines = pdf.splitTextToSize(text, 178) as string[];
    if (y + lines.length * 5 > 280) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(lines, 16, y);
    y += lines.length * 5 + 4;
  });
  return pdf;
}
// Create the common report PDF and save it with the filename supplied by the screen.
export function downloadPDF(
  filename: string,
  title: string,
  rows: (string | number)[][],
) {
  reportPDF(title, rows).save(filename);
}
// Bundle a PDF and CSV into a ZIP. Byte arrays are needed by fflate/Blob; the existing download filename is retained even though the content is a financial summary.
export function downloadReportPack(rows: (string | number)[][]) {
  const pdf = reportPDF("Financial Records Summary", rows);
  // Prepare csv by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
  const archive = zipSync({
    "fintrack-summary.pdf": new Uint8Array(pdf.output("arraybuffer")),
    "fintrack-summary.csv": strToU8(csv),
  });
  const blob = new Blob([new Uint8Array(archive)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fintrack-annual-tax-pack.zip";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Escape XML-sensitive characters and generate spreadsheet XML. This is Excel-compatible text, not an XLSX workbook or a backend report endpoint.
export function downloadExcel(filename: string, rows: (string | number)[][]) {
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  // Prepare xml by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="FinTrack"><Table>${rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escape(String(cell))}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  downloadFile(filename, xml, "application/vnd.ms-excel");
}
