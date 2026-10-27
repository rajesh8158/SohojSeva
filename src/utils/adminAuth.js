// src/utils/adminAuth.js
// Admin authentication middleware

module.exports = function adminAuth(req, res, next) {
  if (req.session && req.session.isSuperadmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};
