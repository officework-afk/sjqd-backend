export function generateInvoiceNo(prefix, id) {
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(id).padStart(4, "0")}`;
}
