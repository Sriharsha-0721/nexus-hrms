/**
 * Formats a numeric value into Indian Rupee (INR) format.
 * Example: 55277 -> ₹55,277
 * Example: 1050000 -> ₹10,50,000
 * Example: -1000 -> -₹1,000
 * Example: 5200.5 -> ₹5,200.50
 * 
 * @param {number|string} value - The numerical value to format.
 * @returns {string} The formatted INR string.
 */
export const formatINR = (value) => {
  if (value === undefined || value === null) return '₹0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0';
  
  const absoluteValue = Math.abs(num);
  const hasDecimals = absoluteValue % 1 !== 0;
  const formattedNum = absoluteValue.toLocaleString('en-IN', {
    maximumFractionDigits: hasDecimals ? 2 : 0,
    minimumFractionDigits: hasDecimals ? 2 : 0
  });
  
  return num < 0 ? `-₹${formattedNum}` : `₹${formattedNum}`;
};
