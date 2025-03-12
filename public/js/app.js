/**
 * Virtual Vinyl Player Application
 * Client-side logic for the vinyl player interface
 */

// API URL (same domain for local development)
const API_URL = '/api/spotify';

// DOM Elements
const artistInput = document.getElementById('artistInput');
const searchArtistBtn = document.getElementById('searchArtistBtn');
const albumSelect = document.getElementById('albumSelect');
const loadAlbumBtn = document.getElementById('loadAlbumBtn');
const vinyl = document.getElementById('vinyl');
const tonearm = document.getElementById('tonearm');
const albumCover = document.getElementById('albumCover');
const albumInfo = document.getElementById('albumInfo');
const trackList = document.getElementById('trackList');
const audioPlayer = document.getElementById('audioPlayer');

// Application state
let currentArtist = null;
let currentAlbum = null;
let currentTrack = null;
let isPlaying = false;

/**
 * Make API requests with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} params - URL parameters
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, params = {}) {
  try {
    // Build query string
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const url = `${API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Initialize the application
 */
function initApp() {
  // Set up event listeners
  setupEventListeners();
  console.log('Virtual Vinyl Player initialized');
}

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
  // Artist search button
  searchArtistBtn.addEventListener('click', handleArtistSearch);
  
  // Album load button
  loadAlbumBtn.addEventListener('click', handleAlbumLoad);
  
  // Allow pressing Enter in the artist input field
  artistInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleArtistSearch();
    }
  });
  
  // Audio player events
  audioPlayer.addEventListener('ended', handleTrackEnded);
  audioPlayer.addEventListener('error', handlePlaybackError);
}

/**
 * Handle artist search button click
 */
async function handleArtistSearch() {
  const artistName = artistInput.value.trim();
  
  if (!artistName) {
    return;
  }
  
  try {
    // Reset UI elements
    resetAlbumSelection();
    
    // Show loading state
    searchArtistBtn.textContent = 'Searching...';
    searchArtistBtn.disabled = true;
    
    // Search for artist
    currentArtist = await apiRequest('/artist', { name: artistName });
    
    if (currentArtist) {
      // Get albums for this artist
      const albums = await apiRequest(`/artist/${currentArtist.id}/albums`);
      
      // Populate album dropdown
      populateAlbumDropdown(albums);
      
      // Enable album selection
      albumSelect.disabled = false;
      loadAlbumBtn.disabled = false;
    } else {
      alert(`Artist "${artistName}" not found. Please try another name.`);
    }
  } catch (error) {
    console.error('Error during artist search:', error);
    alert(`An error occurred while searching: ${error.message}`);
  } finally {
    // Reset button state
    searchArtistBtn.textContent = 'Search Artist';
    searchArtistBtn.disabled = false;
  }
}

/**
 * Handle album load button click
 */
async function handleAlbumLoad() {
  const albumId = albumSelect.value;
  
  if (!albumId) {
    return;
  }
  
  try {
    // Show loading state
    loadAlbumBtn.textContent = 'Loading...';
    loadAlbumBtn.disabled = true;
    
    // Fetch album details
    currentAlbum = await apiRequest(`/album/${albumId}`);
    
    // Update UI with album details
    updateAlbumDisplay(currentAlbum);
    
    // Create track listing
    createTrackList(currentAlbum.tracks.items);
    
    // Auto-play first track
    if (currentAlbum.tracks.items.length > 0) {
      playTrack(currentAlbum.tracks.items[0], 0);
    }
  } catch (error) {
    console.error('Error loading album:', error);
    alert(`An error occurred while loading the album: ${error.message}`);
  } finally {
    // Reset button state
    loadAlbumBtn.textContent = 'Load Album';
    loadAlbumBtn.disabled = false;
  }
}

/**
 * Reset album selection UI elements
 */
function resetAlbumSelection() {
  albumSelect.innerHTML = '<option value="">Select an album</option>';
  albumSelect.disabled = true;
  loadAlbumBtn.disabled = true;
  stopPlayback();
}

/**
 * Populate album dropdown with available albums
 * @param {Array} albums - List of album objects
 */
function populateAlbumDropdown(albums) {
  // Clear existing options except the placeholder
  albumSelect.innerHTML = '<option value="">Select an album</option>';
  
  // Add album options, removing duplicates by name
  const uniqueAlbums = {};
  
  albums.forEach(album => {
    // Skip if we already have this album name (to handle duplicates)
    if (uniqueAlbums[album.name]) {
      return;
    }
    
    uniqueAlbums[album.name] = album;
    
    const option = document.createElement('option');
    option.value = album.id;
    option.textContent = album.name;
    albumSelect.appendChild(option);
  });
}

/**
 * Update the album display with the selected album
 * @param {Object} album - Album data
 */
function updateAlbumDisplay(album) {
  // Update album info
  albumInfo.innerHTML = `
    <h2>${album.name}</h2>
    <p>${album.artists[0].name} • ${album.release_date.slice(0, 4)} • ${album.total_tracks} tracks</p>
  `;
  
  // Set album cover image
  if (album.images.length > 0) {
    albumCover.style.backgroundImage = `url(${album.images[0].url})`;
  } else {
    albumCover.style.backgroundImage = 'none';
  }
}

/**
 * Create the track listing for the album
 * @param {Array} tracks - List of track objects
 */
function createTrackList(tracks) {
  // Clear existing track list
  trackList.innerHTML = '';
  
  // Create track items
  tracks.forEach((track, index) => {
    const trackElement = document.createElement('div');
    trackElement.classList.add('track');
    trackElement.innerHTML = `
      <span>${index + 1}. ${track.name}</span>
      <span>${formatDuration(track.duration_ms)}</span>
    `;
    
    // Add click handler to play this track
    trackElement.addEventListener('click', () => {
      playTrack(track, index);
    });
    
    trackList.appendChild(trackElement);
  });
}

/**
 * Play a specific track
 * @param {Object} track - Track data object
 * @param {number} index - Track index in the list
 */
function playTrack(track, index) {
  // Update track selection in UI
  document.querySelectorAll('.track').forEach((el, i) => {
    if (i === index) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
  
  // Set as current track
  currentTrack = track;
  
  // Check if track has a preview URL
  if (track.preview_url) {
    // Set source and play
    audioPlayer.src = track.preview_url;
    audioPlayer.play()
      .then(() => {
        startPlayback();
      })
      .catch(error => {
        console.error('Playback error:', error);
        alert('Unable to play this track. Spotify preview may not be available.');
        stopPlayback();
      });
  } else {
    alert('Sorry, preview not available for this track');
    stopPlayback();
  }
}

/**
 * Start playback visual effects
 */
function startPlayback() {
  isPlaying = true;
  vinyl.classList.add('spinning');
  tonearm.classList.add('playing');
}

/**
 * Stop playback and visual effects
 */
function stopPlayback() {
  audioPlayer.pause();
  isPlaying = false;
  vinyl.classList.remove('spinning');
  tonearm.classList.remove('playing');
  
  // Clear active track
  document.querySelectorAll('.track').forEach(el => {
    el.classList.remove('active');
  });
}

/**
 * Handle track ending
 */
function handleTrackEnded() {
  // Find current track index
  const currentIndex = currentAlbum.tracks.items.findIndex(track => 
    track.id === currentTrack.id
  );
  
  // Move to next track if available
  const nextIndex = currentIndex + 1;
  if (nextIndex < currentAlbum.tracks.items.length) {
    playTrack(currentAlbum.tracks.items[nextIndex], nextIndex);
  } else {
    // End of album
    stopPlayback();
  }
}

/**
 * Handle playback error
 */
function handlePlaybackError() {
  console.error('Audio playback error');
  stopPlayback();
  alert('An error occurred during playback. The track may not be available for preview.');
}

/**
 * Format milliseconds to MM:SS format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', initApp);