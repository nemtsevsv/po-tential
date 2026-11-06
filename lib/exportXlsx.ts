import * as XLSX from "xlsx";

export function exportToXlsx(filename: string, header: string[], rows: (string | number)[][], sheetName = "Sheet1") {
  const data: (string | number)[][] = [header, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Reasonable column widths so it doesn't open looking cramped
  worksheet["!cols"] = header.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
