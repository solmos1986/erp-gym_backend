// utils/pdf.util.js

export const truncateText = (text, maxLength = 15) => {
  if (!text) return "-";

  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};
