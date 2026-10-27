// src/routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Health
router.get('/health', apiController.health);
// Public info
router.get('/public-info', apiController.publicInfo);
// Approved reviews
router.get('/reviews', apiController.getReviews);
// Contact info
const contactController = require('../controllers/contactController');
router.get('/contact-info', contactController.getContactInfo);

// Create request
router.post('/requests', apiController.postRequest);
// Post review
router.post('/reviews', apiController.postReview);

module.exports = router;
