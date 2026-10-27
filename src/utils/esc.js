// src/utils/esc.js
// Simple HTML escape function

module.exports = function esc(str) {
  return String(str || '').replace(/[&<>\"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[ch]));
};
