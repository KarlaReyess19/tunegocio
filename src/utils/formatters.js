/**
 * Formats a number as Honduran Lempiras (HNL)
 * @param {number} value - The number to format
 * @returns {string} The formatted string (e.g., L 1,250.00)
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace('HNL', 'L'); // Ensure it uses 'L' instead of 'HNL' if the locale defaults to the ISO code
};
