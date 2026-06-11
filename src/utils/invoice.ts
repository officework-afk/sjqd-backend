export function generateInvoiceNo(prefix: string, id: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(id).padStart(4, "0")}`;
}