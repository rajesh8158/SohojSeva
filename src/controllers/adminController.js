// src/controllers/adminController.js

const db = require('../db/db');
const esc = require('../utils/esc');
const { getGuestCount, setSetting } = require('../services/settingService');
const path = require('path');
const fs = require('fs');
const superadmin = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/superadmin.json'))
);

exports.showLogin = (req, res) => {
  if (req.session && req.session.isSuperadmin) return res.redirect('/admin');
  let err = req.query.error ? '<div class="error">Invalid credentials</div>' : '';
  fs.readFile(path.join(__dirname, '../../public/admin-login.html'), 'utf8', (e, html) => {
    if (e) return res.status(500).send('Login page missing.');
    res.send(html.replace('{{error}}', err));
  });
};

exports.handleLogin = (req, res) => {
  const { username, password } = req.body || {};
  if (
    username &&
    password &&
    username === superadmin.username &&
    password === superadmin.password
  ) {
    req.session.isSuperadmin = true;
    res.redirect('/admin');
  } else {
    return res.redirect('/admin/login?error=1');
  }
};

exports.handleLogout = (req, res) => {
  if (req.session) req.session.destroy(() => res.redirect('/admin/login'));
  else res.redirect('/admin/login');
};

exports.dashboard = (req, res) => {
  const requests = db.prepare('SELECT * FROM requests ORDER BY id DESC LIMIT 200').all();
  const reviews = db.prepare('SELECT * FROM reviews ORDER BY id DESC LIMIT 200').all();
  const statusOptions = ['Pending','In Progress','Completed','Cancelled'];

  const requestRows = requests.map(r =>
    `<tr><td>${esc(r.ref)}</td><td>${esc(r.name)}<br>${esc(r.phone)}</td><td>${esc(r.service)}</td><td>${esc(r.arrival_date||'—')}</td>
      <td><form method="post" action="/admin/request/status"><input type="hidden" name="id" value="${r.id}">
      <select name="status">${statusOptions.map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select>
      <button>Save</button></form></td>
      <td><details><summary>Details</summary>${esc(r.address)}<br>${esc(r.message)}</details></td></tr>`).join('');

  const reviewRows = reviews.map(r =>
    `<tr><td>${r.id}</td><td>${esc(r.name)}</td><td>${'★'.repeat(r.rating)}</td><td>${esc(r.message)}</td><td>${esc(r.status)}</td>
      <td>
      <form method="post" action="/admin/review/status">
        <input type="hidden" name="id" value="${r.id}">
        <select name="status">
            <option value="pending" ${r.status==='pending'?'selected':''}>Pending</option>
            <option value="approved" ${r.status==='approved'?'selected':''}>Approved</option>
            <option value="hidden" ${r.status==='hidden'?'selected':''}>Hidden</option>
        </select>
        <button>Save</button>
      </form>
      <form method="post" action="/admin/review/delete" onsubmit="return confirm('Permanently delete this review? This cannot be undone.');">
        <input type="hidden" name="id" value="${r.id}">
        <button class="danger">Delete permanently</button>
      </form>
      </td>
    </tr>`
  ).join('');

  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sohoj Seva Admin</title>
  <style>body{font:15px Arial;margin:20px;background:#f3f7fb;color:#143454}h1,h2{color:#006b61}section{background:white;padding:18px;margin:18px 0;border-radius:12px;overflow:auto}table{border-collapse:collapse;width:100%;min-width:700px}td,th{border:1px solid #d7e5f1;padding:8px;text-align:left;vertical-align:top}button{padding:7px 10px;background:#0869c9;color:white;border:0;border-radius:5px;margin:4px;cursor:pointer}.danger{background:#c62828}input,select{padding:7px;max-width:180px}.counter{font-size:22px;font-weight:bold}</style>
  </head><body>
  <h1>সহজযাত্রা — Admin Dashboard</h1>
  <section><h2>Guest counter</h2><p class="counter">${getGuestCount().toLocaleString('en-IN')} guests served</p>
  <form method="post" action="/admin/guest-count"><label>Change total by: <input type="number" name="delta" value="1" required></label><button>Update total</button></form>
  <small>Automatic rule: adds 2 × day of month once per date.</small></section>
  <section><h2>Requests (${requests.length} latest)</h2><table><thead><tr><th>Reference</th><th>Contact</th><th>Service</th><th>Arrival</th><th>Status</th><th>Details</th></tr></thead><tbody>${requestRows||'<tr><td colspan=\"6\">No requests yet</td></tr>'}</tbody></table></section>
  <section><h2>Reviews — approve, hide or delete</h2><p>Only Approved reviews appear publicly. Delete permanently removes a review from SQLite.</p>
  <table><thead><tr><th>ID</th><th>Name</th><th>Rating</th><th>Review</th><th>Status</th><th>Actions</th></tr></thead><tbody>${reviewRows||'<tr><td colspan=\"6\">No reviews yet</td></tr>'}</tbody></table></section>
  </body></html>`);
};

exports.updateRequestStatus = (req, res) => {
  db.prepare('UPDATE requests SET status=? WHERE id=?').run(req.body.status, Number(req.body.id));
  res.redirect('/admin');
};

exports.updateReviewStatus = (req, res) => {
  const s = ['pending','approved','hidden'].includes(req.body.status) ? req.body.status : 'pending';
  db.prepare('UPDATE reviews SET status=? WHERE id=?').run(s, Number(req.body.id));
  res.redirect('/admin');
};

exports.deleteReview = (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id=?').run(Number(req.body.id));
  res.redirect('/admin');
};

exports.updateGuestCount = (req, res) => {
  const delta = Number(req.body.delta);
  if (Number.isInteger(delta) && Math.abs(delta) <= 1000000) {
    setSetting('guest_count', String(Math.max(0, getGuestCount() + delta)));
  }
  res.redirect('/admin');
};
