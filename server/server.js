/**
 * Virtual Vinyl Player - Server
 * Main server file for the application
 */

// Import required packages
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const spotifyRoutes = require('./routes/spotify');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/spotify', spotifyRoutes);

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the application`);
});