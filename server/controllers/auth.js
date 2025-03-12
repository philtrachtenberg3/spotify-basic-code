/**
 * Spotify Authentication Controller
 * Handles user authentication with Spotify
 */

const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

// Spotify API credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';

// Store state for CSRF protection
const stateKey = 'spotify_auth_state';

// Create a random string for state
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Login with Spotify
 * Redirects to Spotify auth page
 */
exports.login = (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // Define the scopes (permissions) we need
  const scope = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'streaming'
  ].join(' ');

  // Redirect to Spotify's authorization page
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state
    }));
};

/**
 * Callback after Spotify authorization
 * Exchanges authorization code for access token
 */
exports.callback = async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);

    try {
      // Exchange authorization code for access token
      const response = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        params: {
          code: code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const {
        access_token,
        refresh_token,
        expires_in
      } = response.data;

      // Calculate expiration time (current time + expires_in seconds)
      const expires_at = Date.now() + (expires_in * 1000);

      // Set the tokens in cookies for client access
      // Note: In production, you'd want to use secure, httpOnly cookies
      res.cookie('spotify_access_token', access_token, { maxAge: expires_in * 1000 });
      res.cookie('spotify_refresh_token', refresh_token, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
      res.cookie('spotify_expires_at', expires_at.toString(), { maxAge: expires_in * 1000 });

      // Redirect back to the application
      res.redirect('/');
    } catch (error) {
      console.error('Error during token exchange:', error.message);
      if (error.response) {
        console.error('Spotify API response:', error.response.data);
      }
      res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
    }
  }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
  // Get the refresh token from the request
  const refresh_token = req.body.refresh_token || req.cookies.spotify_refresh_token;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    // Get a new access token
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, expires_in } = response.data;
    const expires_at = Date.now() + (expires_in * 1000);

    // Update cookies
    res.cookie('spotify_access_token', access_token, { maxAge: expires_in * 1000 });
    res.cookie('spotify_expires_at', expires_at.toString(), { maxAge: expires_in * 1000 });

    res.json({
      access_token,
      expires_in,
      expires_at
    });
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    if (error.response) {
      console.error('Spotify API response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

/**
 * Get current user's profile
 */
exports.getUserProfile = async (req, res) => {
  const access_token = req.cookies.spotify_access_token;

  if (!access_token) {
    return res.status(401).json({ error: 'No access token' });
  }

  try {
    const response = await axios({
      method: 'get',
      url: 'https://api.spotify.com/v1/me',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error getting user profile:', error.message);
    if (error.response && error.response.status === 401) {
      res.status(401).json({ error: 'Access token expired', needsRefresh: true });
    } else {
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }
};

/**
 * Check if user is authenticated
 */
exports.checkAuth = (req, res) => {
  const access_token = req.cookies.spotify_access_token;
  const refresh_token = req.cookies.spotify_refresh_token;
  const expires_at = req.cookies.spotify_expires_at;

  if (!access_token || !refresh_token) {
    return res.json({ authenticated: false });
  }

  // Check if token is expired
  const isExpired = Date.now() > parseInt(expires_at || '0');

  res.json({
    authenticated: true,
    expired: isExpired,
    access_token: isExpired ? null : access_token,
    refresh_token
  });
};

/**
 * Logout user by clearing cookies
 */
exports.logout = (req, res) => {
  res.clearCookie('spotify_access_token');
  res.clearCookie('spotify_refresh_token');
  res.clearCookie('spotify_expires_at');
  
  res.json({ success: true });
};