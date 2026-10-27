// src/controllers/apiController.js

const db = require('../db/db');
const makeRef = require('../utils/makeRef');
const { getGuestCount } = require('../services/settingService');

exports.health = (req, res) =>
  res.json({ ok: true, service: 'sohoj-seva', time: new Date().toISOString() });

exports.publicInfo = (req, res) =>
  res.json({
    guestCount: getGuestCount(),
    siteName: process.env.SITE_NAME || 'সহজযাত্রা'
  });

exports.getReviews = (req, res) =>
  res.json(
    db.prepare(
      "SELECT id,name,language,rating,message,created_at FROM reviews WHERE status='approved' ORDER BY id DESC LIMIT 20"
    ).all()
  );

exports.postRequest = (req, res) => {
  const b = req.body || {};

  // Required: name, phone, service. Optional: message.
  const required = ['name', 'phone', 'service'];
  if (required.some((k) => !String(b[k] || '').trim())) {
    return res.status(400).json({ error: 'নাম, ফোন ও সেবা পূরণ করুন।' });
  }

  const phoneDigits = String(b.phone || '').replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    return res.status(400).json({ error: 'ফোন নম্বর অবশ্যই ১০ ডিজিট হতে হবে।' });
  }

  if (String(b.name).length > 100 || String(b.message || '').length > 2000) {
    return res.status(400).json({ error: 'কিছু তথ্য নির্ধারিত সীমার চেয়ে বড়।' });
  }

  const ref = makeRef(b.service);

  // Keep DB schema unchanged; store blank for removed fields like address.
  // Message is now optional but stored.
  db.prepare(
    `INSERT INTO requests(ref,name,phone,address,arrival_date,drop_date,service,message,contact_method)
     VALUES(?,?,?,?,?,?,?,?,?)`
  ).run(
    ref,
    String(b.name).trim(),
    phoneDigits,
    '',
    b.arrival_date || '',
    b.drop_date || '',
    String(b.service),
    String(b.message || '').trim(),
    'website'
  );

  res.status(201).json({
    ok: true,
    ref,
    message: 'আপনার অনুরোধ জমা হয়েছে। অপারেটর সাধারণত ১৫ মিনিটের মধ্যে যোগাযোগ করবেন।'
  });
};

exports.postReview = (req, res) => {
  const b = req.body;
  if (!String(b.name || '').trim() || !String(b.message || '').trim()) {
    return res.status(400).json({ error: 'নাম ও রিভিউ লিখুন।' });
  }
  if (String(b.name).length > 100 || String(b.message).length > 1000) {
    return res.status(400).json({ error: 'রিভিউ খুব বড়।' });
  }
  db.prepare('INSERT INTO reviews(name,language,rating,message,status) VALUES(?,?,?,?,?)').run(
    String(b.name).trim(),
    b.language === 'en' ? 'en' : 'bn',
    Math.min(5, Math.max(1, Number(b.rating) || 5)),
    String(b.message).trim(),
    'pending'
  );
  res.status(201).json({ ok: true, message: 'ধন্যবাদ! প্রকাশের আগে রিভিউটি যাচাই করা হবে।' });
};
