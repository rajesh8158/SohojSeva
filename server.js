require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const dbPath = path.resolve(process.env.DB_PATH || './data/sohoj-seva.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
 address TEXT NOT NULL, arrival_date TEXT, drop_date TEXT, service TEXT NOT NULL, message TEXT NOT NULL,
 contact_method TEXT DEFAULT 'website', status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reviews (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'bn', rating INTEGER NOT NULL DEFAULT 5,
 message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
const setting = db.prepare('SELECT value FROM settings WHERE key=?');
const putSetting = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
if (!setting.get('guest_count')) putSetting.run('guest_count', '9761');
if (!setting.get('last_auto_day')) putSetting.run('last_auto_day', '');
if (!setting.get('last_auto_month')) putSetting.run('last_auto_month', '');
// Add 2 x day-of-month once per calendar date; admin can also adjust the total.
const now = new Date();
const dayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
if (setting.get('last_auto_day').value !== dayKey) {
  putSetting.run('guest_count', String(Number(setting.get('guest_count').value) + (2 * now.getDate())));
  putSetting.run('last_auto_day', dayKey);
}
const count = () => Number(setting.get('guest_count').value || 0);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '30kb' }));
app.use(express.json({ limit: '30kb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public')));
function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function adminAuth(req,res,next) {
 const header = req.headers.authorization || '';
 if (header.startsWith('Basic ')) {
  const [user, ...pass] = Buffer.from(header.slice(6), 'base64').toString().split(':');
  if (user === (process.env.ADMIN_USER || 'admin') && pass.join(':') === (process.env.ADMIN_PASSWORD || '')) return next();
 }
 res.set('WWW-Authenticate', 'Basic realm="Sohoj Seva Admin"'); return res.status(401).send('Admin login required. Configure ADMIN_USER and ADMIN_PASSWORD in .env.');
}
function makeRef(service) {
 const p = ({'flight':'TRV','train':'TRN','hospital':'HSP','visa':'VSA'})[service] || 'GEN';
 return `${p}-${Date.now().toString().slice(-6)}${Math.floor(Math.random()*90+10)}`;
}
app.get('/health', (req,res) => res.json({ ok:true, service:'sohoj-seva', time:new Date().toISOString() }));
app.get('/api/public-info', (req,res) => res.json({ guestCount:count(), siteName:process.env.SITE_NAME || 'সহজযাত্রা' }));
app.get('/api/reviews', (req,res) => res.json(db.prepare("SELECT id,name,language,rating,message,created_at FROM reviews WHERE status='approved' ORDER BY id DESC LIMIT 20").all()));
app.post('/api/requests', (req,res) => {
 const b=req.body; const required=['name','phone','address','service','message'];
 if (required.some(k => !String(b[k]||'').trim())) return res.status(400).json({error:'নাম, ফোন, ঠিকানা, সেবা ও বার্তা পূরণ করুন।'});
 if (String(b.name).length>100 || String(b.phone).length>30 || String(b.address).length>500 || String(b.message).length>2000) return res.status(400).json({error:'কিছু তথ্য নির্ধারিত সীমার চেয়ে বড়।'});
 const ref=makeRef(b.service);
 db.prepare(`INSERT INTO requests(ref,name,phone,address,arrival_date,drop_date,service,message,contact_method) VALUES(?,?,?,?,?,?,?,?,?)`).run(ref,String(b.name).trim(),String(b.phone).trim(),String(b.address).trim(),b.arrival_date||'',b.drop_date||'',String(b.service),String(b.message).trim(),b.contact_method==='whatsapp'?'whatsapp':'website');
 res.status(201).json({ok:true,ref,message:'আপনার অনুরোধ জমা হয়েছে। অপারেটর সাধারণত ১৫ মিনিটের মধ্যে যোগাযোগ করবেন।'});
});
app.post('/api/reviews', (req,res) => {
 const b=req.body; if(!String(b.name||'').trim() || !String(b.message||'').trim()) return res.status(400).json({error:'নাম ও রিভিউ লিখুন।'});
 if(String(b.name).length>100 || String(b.message).length>1000) return res.status(400).json({error:'রিভিউ খুব বড়।'});
 db.prepare('INSERT INTO reviews(name,language,rating,message,status) VALUES(?,?,?,?,?)').run(String(b.name).trim(),b.language==='en'?'en':'bn',Math.min(5,Math.max(1,Number(b.rating)||5)),String(b.message).trim(),'pending');
 res.status(201).json({ok:true,message:'ধন্যবাদ! প্রকাশের আগে রিভিউটি যাচাই করা হবে।'});
});
app.get('/admin', adminAuth, (req,res) => {
 const requests=db.prepare('SELECT * FROM requests ORDER BY id DESC LIMIT 200').all();
 const reviews=db.prepare('SELECT * FROM reviews ORDER BY id DESC LIMIT 200').all();
 const statusOptions=['Pending','In Progress','Completed','Cancelled'];
 const requestRows=requests.map(r=>`<tr><td>${esc(r.ref)}</td><td>${esc(r.name)}<br>${esc(r.phone)}</td><td>${esc(r.service)}</td><td>${esc(r.arrival_date||'—')}</td><td><form method="post" action="/admin/request/status"><input type="hidden" name="id" value="${r.id}"><select name="status">${statusOptions.map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select><button>Save</button></form></td><td><details><summary>Details</summary>${esc(r.address)}<br>${esc(r.message)}</details></td></tr>`).join('');
 const reviewRows=reviews.map(r=>`<tr><td>${r.id}</td><td>${esc(r.name)}</td><td>${'★'.repeat(r.rating)}</td><td>${esc(r.message)}</td><td>${esc(r.status)}</td><td><form method="post" action="/admin/review/status"><input type="hidden" name="id" value="${r.id}"><select name="status"><option value="pending" ${r.status==='pending'?'selected':''}>Pending</option><option value="approved" ${r.status==='approved'?'selected':''}>Approved</option><option value="hidden" ${r.status==='hidden'?'selected':''}>Hidden</option></select><button>Save</button></form><form method="post" action="/admin/review/delete" onsubmit="return confirm('Permanently delete this review? This cannot be undone.');"><input type="hidden" name="id" value="${r.id}"><button class="danger">Delete permanently</button></form></td></tr>`).join('');
 res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sohoj Seva Admin</title><style>body{font:15px Arial;margin:20px;background:#f3f7fb;color:#143454}h1,h2{color:#006b61}section{background:white;padding:18px;margin:18px 0;border-radius:12px;overflow:auto}table{border-collapse:collapse;width:100%;min-width:700px}td,th{border:1px solid #d7e5f1;padding:8px;text-align:left;vertical-align:top}button{padding:7px 10px;background:#0869c9;color:white;border:0;border-radius:5px;margin:4px;cursor:pointer}.danger{background:#c62828}input,select{padding:7px;max-width:180px}.counter{font-size:22px;font-weight:bold}</style></head><body><h1>সহজযাত্রা — Admin Dashboard</h1><section><h2>Guest counter</h2><p class="counter">${count().toLocaleString('en-IN')} guests served</p><form method="post" action="/admin/guest-count"><label>Change total by: <input type="number" name="delta" value="1" required></label><button>Update total</button></form><small>Automatic rule: adds 2 × day of month once per date.</small></section><section><h2>Requests (${requests.length} latest)</h2><table><thead><tr><th>Reference</th><th>Contact</th><th>Service</th><th>Arrival</th><th>Status</th><th>Details</th></tr></thead><tbody>${requestRows||'<tr><td colspan="6">No requests yet</td></tr>'}</tbody></table></section><section><h2>Reviews — approve, hide or delete</h2><p>Only Approved reviews appear publicly. Delete permanently removes a review from SQLite.</p><table><thead><tr><th>ID</th><th>Name</th><th>Rating</th><th>Review</th><th>Status</th><th>Actions</th></tr></thead><tbody>${reviewRows||'<tr><td colspan="6">No reviews yet</td></tr>'}</tbody></table></section></body></html>`);
});
app.post('/admin/request/status',adminAuth,(req,res)=>{db.prepare('UPDATE requests SET status=? WHERE id=?').run(req.body.status,Number(req.body.id));res.redirect('/admin');});
app.post('/admin/review/status',adminAuth,(req,res)=>{const s=['pending','approved','hidden'].includes(req.body.status)?req.body.status:'pending';db.prepare('UPDATE reviews SET status=? WHERE id=?').run(s,Number(req.body.id));res.redirect('/admin');});
app.post('/admin/review/delete',adminAuth,(req,res)=>{db.prepare('DELETE FROM reviews WHERE id=?').run(Number(req.body.id));res.redirect('/admin');});
app.post('/admin/guest-count',adminAuth,(req,res)=>{const delta=Number(req.body.delta);if(Number.isInteger(delta)&&Math.abs(delta)<=1000000)putSetting.run('guest_count',String(Math.max(0,count()+delta)));res.redirect('/admin');});
app.listen(PORT,HOST,()=>console.log(`Sohoj Seva listening on http://${HOST}:${PORT}; SQLite: ${dbPath}`));
