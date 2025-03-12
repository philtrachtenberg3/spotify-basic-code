/**
 * Spotify API Routes
 */

const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotify');

// GET token for client
router.get('/token', spotifyController.getToken);

// Search for an artist
router.get('/artist', spotifyController.searchArtist);

// Get albums by artist ID
router.get('/artist/:id/albums', spotifyController.getArtistAlbums);

// Get album details by album ID
router.get('/album/:id', spotifyController.getAlbumDetails);

// Find tracks with previews available
router.get('/find-previews', spotifyController.findTracksWithPreviews);

module.exports = router;