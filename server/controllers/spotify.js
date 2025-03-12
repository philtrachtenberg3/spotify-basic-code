/**
 * Spotify API Controller
 * Handles all Spotify API interactions
 */

const axios = require('axios');

// Spotify API credentials from environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Cache for the token to avoid unnecessary requests
let tokenData = {
  token: null,
  expires: 0
};

/**
 * Get and cache Spotify API token
 * @returns {Promise<string>} Access token
 */
const getSpotifyToken = async () => {
  // Check if we have a valid token
  const now = Date.now();
  if (tokenData.token && tokenData.expires > now) {
    return tokenData.token;
  }

  try {
    // Request new token
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'client_credentials'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      }
    });

    // Cache the token with expiration
    tokenData.token = response.data.access_token;
    // Set expiration time (subtract 60s for safety margin)
    tokenData.expires = now + (response.data.expires_in - 60) * 1000;

    return tokenData.token;
  } catch (error) {
    console.error('Error getting Spotify token:', error.message);
    throw new Error('Failed to obtain Spotify access token');
  }
};

/**
 * Get authentication token (for client)
 * Note: This is a simplified approach - in production, you might want additional security
 */
exports.getToken = async (req, res) => {
  try {
    // Get token
    const token = await getSpotifyToken();
    
    // Return token info to client
    res.json({ 
      token,
      // Only send expiration time, not the actual token expiry for security
      expiresIn: Math.floor((tokenData.expires - Date.now()) / 1000)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search for an artist
 */
exports.searchArtist = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Artist name is required' });
    }
    
    const token = await getSpotifyToken();
    
    const response = await axios({
      method: 'get',
      url: 'https://api.spotify.com/v1/search',
      params: {
        q: name,
        type: 'artist',
        limit: 1
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.artists.items.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json(response.data.artists.items[0]);
  } catch (error) {
    console.error('Error searching for artist:', error.message);
    res.status(500).json({ error: 'Failed to search for artist' });
  }
};

/**
 * Get albums by artist ID
 */
exports.getArtistAlbums = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Artist ID is required' });
    }
    
    const token = await getSpotifyToken();
    
    const response = await axios({
      method: 'get',
      url: `https://api.spotify.com/v1/artists/${id}/albums`,
      params: {
        include_groups: 'album',
        limit: 50
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    res.json(response.data.items);
  } catch (error) {
    console.error('Error getting artist albums:', error.message);
    res.status(500).json({ error: 'Failed to get artist albums' });
  }
};

/**
 * Get album details by album ID
 */
exports.getAlbumDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Album ID is required' });
    }
    
    const token = await getSpotifyToken();
    
    const response = await axios({
      method: 'get',
      url: `https://api.spotify.com/v1/albums/${id}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting album details:', error.message);
    res.status(500).json({ error: 'Failed to get album details' });
  }
};