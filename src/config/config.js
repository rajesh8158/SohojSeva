// src/config/config.js
// Loads env/config settings

require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT || 3001),
  HOST: process.env.HOST || '0.0.0.0',
  DB_PATH: process.env.DB_PATH || './data/sohoj-seva.sqlite',
};
