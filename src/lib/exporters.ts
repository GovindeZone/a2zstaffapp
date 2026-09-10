import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const BRAND = "A to Z";
const ADDRESS = "OMR Road, Navalur Junction, Chennai";

export function exportToExcel(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const sheet = XLSX.utils.aoa_to_sheet([[BRAND], [ADDRESS], [], headers, ...rows]);
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(12, header.length + 4) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 30));
  XLSX.writeFile(book, `${fileName}.xlsx`);
}

export function exportToPdf(
  fileName: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait" });

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text(BRAND, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(ADDRESS, 14, 24);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, 14, 39);

  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => row.map((cell) => String(cell))),
    startY: 44,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [186, 88, 44], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 246, 240] },
  });

  doc.save(`${fileName}.pdf`);
}
