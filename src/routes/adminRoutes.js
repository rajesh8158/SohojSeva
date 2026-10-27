const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../utils/adminAuth');

// Login/logout
router.get('/login', adminController.showLogin);  // GET login page
router.post('/login', adminController.handleLogin); // POST login credentials
router.get('/logout', adminController.handleLogout); // Logout and destroy session

// Superadmin-protected routes
router.get('/', adminAuth, adminController.dashboard);

router.post('/request/status', adminAuth, adminController.updateRequestStatus);
router.post('/review/status', adminAuth, adminController.updateReviewStatus);
router.post('/review/delete', adminAuth, adminController.deleteReview);
router.post('/guest-count', adminAuth, adminController.updateGuestCount);

module.exports = router;
