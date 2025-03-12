/**
 * Spotify Web Playback SDK Integration
 * Handles playback of full tracks for Premium users
 */

// Global variables
let spotifyPlayer = null;
let deviceId = null;
let playerConnected = false;
let currentTrackId = null;
window.playerIsPlaying = false;

console.log("Player.js loading, SDK ready:", !!window.Spotify);

// DOM elements
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingArtist = document.getElementById('nowPlayingArtist');
const playerStatus = document.getElementById('player-status');

/**
 * Initialize the Spotify Web Playback SDK
 * This is called when the SDK is loaded
 */
window.onSpotifyWebPlaybackSDKReady = () => {
  console.log('Spotify Web Playback SDK is ready');
  
  // We'll initialize the player when the user logs in
  // This is handled in the app.js
};

/**
 * Create and initialize the Spotify player
 * @returns {Promise<boolean>} Success status
 */
async function initPlayer() {
  const authState = window.spotifyAuth.getAuthState();
  console.log("Init player with auth state:", authState);
  
  if (!authState.authenticated) {
    console.warn('Cannot initialize player: User not authenticated');
    return false;
  }
  
  if (!window.Spotify) {
    console.error("Spotify Web Playback SDK not loaded!");
    return false;
  }
  
  if (spotifyPlayer) {
    // Player already exists
    return true;
  }
  
  return new Promise((resolve) => {
    spotifyPlayer = new Spotify.Player({
      name: 'Virtual Vinyl Player',
      getOAuthToken: cb => {
        // Provide the current access token
        cb(authState.accessToken);
      },
      volume: 0.5
    });
    
    // Error handling
    spotifyPlayer.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize player:', message);
      resolve(false);
    });
    
    spotifyPlayer.addListener('authentication_error', async ({ message }) => {
      console.error('Failed to authenticate:', message);
      // Try to refresh the token
      const refreshed = await refreshToken();
      if (refreshed) {
        // Re-initialize player
        spotifyPlayer.disconnect();
        initPlayer();
      }
      resolve(false);
    });
    
    spotifyPlayer.addListener('account_error', ({ message }) => {
      console.error('Premium required:', message);
      showNotification('Spotify Premium required for full track playback');
      resolve(false);
    });
    
    spotifyPlayer.addListener('playback_error', ({ message }) => {
      console.error('Playback error:', message);
      resolve(false);
    });
    
    // Ready
    spotifyPlayer.addListener('ready', ({ device_id }) => {
      console.log('Player ready with Device ID:', device_id);
      deviceId = device_id;
      playerConnected = true;
      resolve(true);
    });
    
    // Not Ready
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID is not ready for playback:', device_id);
      playerConnected = false;
      resolve(false);
    });
    
    // Player state changed
    spotifyPlayer.addListener('player_state_changed', (state) => {
      if (!state) return;
      
      // Update track info
      const trackInfo = state.track_window.current_track;
      updatePlayerInfo(trackInfo);
      
      // Update player state
      window.playerIsPlaying = !state.paused;
      
      // Update UI
      if (window.playerIsPlaying) {
        startPlayback();
      } else {
        pauseVisualPlayback();
      }
    });
    
    // Connect to the player
    spotifyPlayer.connect();
  });
}

/**
 * Play a track on the Spotify player
 * @param {string} trackUri - Spotify track URI
 * @returns {Promise<boolean>} Success status
 */
async function playTrack(trackUri) {
  if (!playerConnected || !deviceId) {
    // Try to initialize the player if not connected
    const initialized = await initPlayer();
    if (!initialized) {
      return fallbackToPreview(trackUri);
    }
  }
  
  try {
    const authState = window.spotifyAuth.getAuthState();
    
    if (!authState.authenticated) {
      return fallbackToPreview(trackUri);
    }
    
    // Play the track on the device
    const response = await window.spotifyAuth.spotifyApiRequest(`/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    if (!response.ok) {
      // If status is 403, it might be a free account
      if (response.status === 403) {
        showNotification('Spotify Premium required for full track playback');
        return fallbackToPreview(trackUri);
      }
      
      const errorData = await response.json();
      console.error('Error playing track:', errorData);
      return fallbackToPreview(trackUri);
    }
    
    currentTrackId = trackUri;
    return true;
  } catch (error) {
    console.error('Failed to play track:', error);
    return fallbackToPreview(trackUri);
  }
}

/**
 * Fall back to preview URL if full playback fails
 * @param {string} trackUri - Spotify track URI
 * @returns {Promise<boolean>} Success status
 */
async function fallbackToPreview(trackUri) {
  try {
    // Extract track ID from URI
    const trackId = trackUri.split(':')[2];
    
    // Get track details from API
    const response = await fetch(`/api/spotify/track/${trackId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get track details');
    }
    
    const track = await response.json();
    
    if (track.preview_url) {
      // Use the audio element to play the preview
      const audioPlayer = document.getElementById('audioPlayer');
      audioPlayer.src = track.preview_url;
      audioPlayer.play()
        .then(() => {
          // Update UI
          updatePlayerInfo({
            name: track.name,
            artists: track.artists
          });
          startPlayback();
          return true;
        })
        .catch(error => {
          console.error('Preview playback error:', error);
          playVinylSound();
          return false;
        });
    } else {
      // No preview available, play vinyl sound
      playVinylSound();
      
      // Update UI with track info anyway
      updatePlayerInfo({
        name: track.name,
        artists: track.artists
      });
    }
    
    return false;
  } catch (error) {
    console.error('Failed to play preview:', error);
    playVinylSound();
    return false;
  }
}

/**
 * Play vinyl crackling sound
 */
function playVinylSound() {
  // This function is defined in app.js
  if (window.playVinylSound) {
    window.playVinylSound();
  }
}

/**
 * Update the player information display
 * @param {Object} trackInfo - Track information
 */
function updatePlayerInfo(trackInfo) {
  if (!trackInfo) return;
  
  nowPlayingTitle.textContent = trackInfo.name || 'Unknown Track';
  
  const artistText = trackInfo.artists ? 
    trackInfo.artists.map(artist => artist.name).join(', ') : 
    'Unknown Artist';
  
  nowPlayingArtist.textContent = artistText;
  
  // Show the player status
  playerStatus.style.display = 'block';
}

/**
 * Pause playback
 * @returns {Promise<boolean>} Success status
 */
async function pausePlayback() {
  if (spotifyPlayer && playerConnected) {
    try {
      await spotifyPlayer.pause();
      window.playerIsPlaying = false;
      pauseVisualPlayback();
      return true;
    } catch (error) {
      console.error('Failed to pause playback:', error);
    }
  }
  
  // Fallback to audio element
  const audioPlayer = document.getElementById('audioPlayer');
  audioPlayer.pause();
  
  // Stop vinyl sound
  if (window.vinylSource) {
    window.vinylSource.stop();
    window.vinylSource = null;
  }
  
  window.playerIsPlaying = false;
  pauseVisualPlayback();
  return true;
}

/**
 * Resume playback
 * @returns {Promise<boolean>} Success status
 */
async function resumePlayback() {
  if (spotifyPlayer && playerConnected) {
    try {
      await spotifyPlayer.resume();
      window.playerIsPlaying = true;
      startPlayback();
      return true;
    } catch (error) {
      console.error('Failed to resume playback:', error);
    }
  }
  
  // Fallback to audio element
  const audioPlayer = document.getElementById('audioPlayer');
  
  if (audioPlayer.src) {
    try {
      await audioPlayer.play();
      window.playerIsPlaying = true;
      startPlayback();
      return true;
    } catch (error) {
      console.error('Failed to resume audio playback:', error);
    }
  }
  
  // Fallback to vinyl sound
  playVinylSound();
  window.playerIsPlaying = true;
  startPlayback();
  return true;
}

/**
 * Start visual playback effects
 * This function is defined in app.js but we duplicate it here for clarity
 */
function startPlayback() {
  window.playerIsPlaying = true;
  
  // These elements are defined in app.js
  const vinyl = document.getElementById('vinyl');
  const tonearm = document.getElementById('tonearm');
  
  if (vinyl) vinyl.classList.add('spinning');
  if (tonearm) tonearm.classList.add('playing');
  
  // Update the play/pause button
  const transportPlayPauseBtn = document.getElementById('transportPlayPauseBtn');
  const playAlbumBtn = document.getElementById('playAlbumBtn');
  
  if (transportPlayPauseBtn) transportPlayPauseBtn.classList.add('paused');
  if (playAlbumBtn) {
    playAlbumBtn.classList.add('pause');
    playAlbumBtn.classList.remove('play');
  }
}

/**
 * Pause visual playback effects
 */
function pauseVisualPlayback() {
  window.playerIsPlaying = false;
  
  // These elements are defined in app.js
  const vinyl = document.getElementById('vinyl');
  const tonearm = document.getElementById('tonearm');
  
  if (vinyl) vinyl.classList.remove('spinning');
  
  // Update the play/pause button
  const transportPlayPauseBtn = document.getElementById('transportPlayPauseBtn');
  const playAlbumBtn = document.getElementById('playAlbumBtn');
  
  if (transportPlayPauseBtn) transportPlayPauseBtn.classList.remove('paused');
  if (playAlbumBtn) {
    playAlbumBtn.classList.remove('pause');
    playAlbumBtn.classList.add('play');
  }
}

/**
 * Toggle playback (play/pause)
 */
async function togglePlayback() {
  if (window.playerIsPlaying) {
    return pausePlayback();
  } else {
    return resumePlayback();
  }
}

/**
 * Get the current playback state
 * @returns {Object} Playback state
 */
function getPlaybackState() {
  return {
    isPlaying: window.playerIsPlaying,
    currentTrackId,
    playerConnected
  };
}

/**
 * Display a notification message
 * This might be defined elsewhere
 * @param {string} message - The message to display
 */
function showNotification(message) {
  if (window.showNotification) {
    window.showNotification(message);
  } else {
    // Fallback if not defined in app.js
    console.log(`Notification: ${message}`);
    
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create a notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove the notification after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Export functions to window
window.spotifyPlayer = {
  initPlayer,
  playTrack,
  pausePlayback,
  resumePlayback,
  togglePlayback,
  getPlaybackState
};