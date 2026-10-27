const db = require('../db/db');

const getSetting = (key) => {
  return db.prepare('SELECT value FROM settings WHERE key=?').get(key);
};
const setSetting = (key, value) => {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
};
const getGuestCount = () => Number(getSetting('guest_count')?.value || 0);

const autoUpdateGuestCount = () => {
  // Add 2 x day-of-month once per calendar date
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  if (getSetting('last_auto_day')?.value !== dayKey) {
    setSetting('guest_count', String(getGuestCount() + (2 * now.getDate())));
    setSetting('last_auto_day', dayKey);
  }
};

module.exports = {
  getSetting,
  setSetting,
  getGuestCount,
  autoUpdateGuestCount,
};
