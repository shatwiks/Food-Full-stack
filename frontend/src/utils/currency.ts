/**
 * Utility for formatting prices in Indian Rupees (₹)
 */
export const formatPrice = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return '₹0';
  }
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(numeric)) {
    return '₹0';
  }

  // Format with standard Indian numbering system (e.g., ₹1,250 or ₹380)
  return `₹${numeric.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};
