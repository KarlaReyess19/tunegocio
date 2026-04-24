export const formatCurrency = (value, symbol = 'L') => {
  return new Intl.NumberFormat('es-HN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace(/^/, `${symbol} `);
};

