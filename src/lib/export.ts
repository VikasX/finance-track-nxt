import { jsPDF } from "jspdf";
import { strToU8, zipSync } from "fflate";
import { downloadFile } from "./finance";

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
    "Personal finance demo statement - not an official bank or tax certificate",
    16,
    41,
  );
  let y = 55;
  rows.forEach((row) => {
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
export function downloadPDF(
  filename: string,
  title: string,
  rows: (string | number)[][],
) {
  reportPDF(title, rows).save(filename);
}
export function downloadReportPack(rows: (string | number)[][]) {
  const pdf = reportPDF("Annual Tax & Contribution Summary", rows);
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
export function downloadExcel(filename: string, rows: (string | number)[][]) {
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="FinTrack"><Table>${rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escape(String(cell))}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  downloadFile(filename, xml, "application/vnd.ms-excel");
}
