/**
 * Spotify Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// Login with Spotify
router.get('/login', authController.login);

// Callback after Spotify authorization
router.get('/callback', authController.callback);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Get user profile
router.get('/profile', authController.getUserProfile);

// Check authentication status
router.get('/check', authController.checkAuth);

// Logout
router.get('/logout', authController.logout);

module.exports = router;