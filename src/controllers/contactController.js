const fs = require('fs');
const path = require('path');

function readContactConfig() {
  const filePath = path.join(__dirname, '../config/contact.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {
      facebookPageUrl: 'https://facebook.com/your-page-placeholder',
      whatsappPhoneNumber: '+91 8158994948'
    };
  }
}

function normalizeWhatsAppNumber(num) {
  // Keep digits only for wa.me link (e.g. +91 8158994948 -> 918158994948)
  return String(num || '').replace(/\D/g, '');
}

exports.getContactInfo = (req, res) => {
  const cfg = readContactConfig();
  const facebookPageUrl = cfg.facebookPageUrl || 'https://facebook.com/your-page-placeholder';
  const whatsappPhoneNumber = cfg.whatsappPhoneNumber || '+91 8158994948';
  const waNumber = normalizeWhatsAppNumber(whatsappPhoneNumber);

  res.json({
    facebookPageUrl,
    whatsappPhoneNumber,
    whatsappLink: waNumber ? `https://wa.me/${waNumber}` : ''
  });
};
