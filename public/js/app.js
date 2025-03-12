/**
 * Display a notification message
 * @param {string} message - The message to display
 */
function showNotification(message) {
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
  }/**
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
  const findPreviewsBtn = document.getElementById('findPreviewsBtn');
  const playAlbumBtn = document.getElementById('playAlbumBtn');
  const transportPlayPauseBtn = document.getElementById('transportPlayPauseBtn');
  const vinyl = document.getElementById('vinyl');
  const tonearm = document.getElementById('tonearm');
  const albumCover = document.getElementById('albumCover');
  const albumInfo = document.getElementById('albumInfo');
  const trackList = document.getElementById('trackList');
  const previewsContainer = document.getElementById('previewsContainer');
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
    
    // Find previews button
    findPreviewsBtn.addEventListener('click', handleFindPreviews);
    
    // Album play button (on vinyl)
    playAlbumBtn.addEventListener('click', handlePlayPauseToggle);
    
    // Transport play/pause button
    transportPlayPauseBtn.addEventListener('click', handlePlayPauseToggle);
    
    // Vinyl click to play
    vinyl.addEventListener('click', (event) => {
      // Only trigger if clicking on the vinyl itself, not the play button
      if (event.target === vinyl || event.target === albumCover) {
        handlePlayPauseToggle();
      }
    });
    
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
   * Handle find previews button click
   */
  async function handleFindPreviews() {
    try {
      // Get search term from artist input
      const searchTerm = artistInput.value.trim() || 'hits';
      
      // Show loading state
      findPreviewsBtn.textContent = 'Searching...';
      findPreviewsBtn.disabled = true;
      
      showNotification('Searching for tracks with preview URLs...');
      
      // Call the API to find tracks with previews
      const data = await apiRequest('/find-previews', { 
        query: searchTerm, 
        type: 'album,track' 
      });
      
      // Display results
      displayPreviewResults(data);
    } catch (error) {
      console.error('Error finding previews:', error);
      showNotification('Error searching for previews');
    } finally {
      // Reset button
      findPreviewsBtn.textContent = 'Find Tracks with Previews';
      findPreviewsBtn.disabled = false;
    }
  }
  
  /**
   * Display preview search results
   * @param {Object} data - The search results data
   */
  function displayPreviewResults(data) {
    // Clear previous results
    previewsContainer.innerHTML = '';
    
    // Create container header
    const header = document.createElement('h2');
    header.textContent = `Found ${data.total_results} results with previews`;
    previewsContainer.appendChild(header);
    
    if (data.total_results === 0) {
      const message = document.createElement('p');
      message.textContent = 'No tracks with previews found. Try a different search term.';
      previewsContainer.appendChild(message);
      return;
    }
    
    // Create results container
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'preview-results';
    
    // Process and display results
    const albums = data.results.filter(item => item.tracks_count !== undefined);
    const tracks = data.results.filter(item => item.tracks_count === undefined);
    
    // Add albums first
    albums.forEach(album => {
      const card = createAlbumCard(album);
      resultsGrid.appendChild(card);
    });
    
    // Add tracks if any
    if (tracks.length > 0) {
      const tracksAlbum = {
        name: 'Tracks with Previews',
        artist: 'Various Artists',
        image: tracks[0]?.image || '',
        tracks: tracks.map(track => ({
          id: track.id,
          name: track.name,
          preview_url: track.preview_url
        }))
      };
      
      const card = createAlbumCard(tracksAlbum);
      resultsGrid.appendChild(card);
    }
    
    previewsContainer.appendChild(resultsGrid);
    
    // Scroll to results
    previewsContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  /**
   * Create an album card element
   * @param {Object} album - Album data
   * @returns {HTMLElement} The album card element
   */
  function createAlbumCard(album) {
    const card = document.createElement('div');
    card.className = 'preview-card';
    
    // Create image
    const image = document.createElement('img');
    image.className = 'preview-image';
    image.src = album.image || '/api/placeholder/300/300';
    image.alt = album.name;
    
    // Create info section
    const info = document.createElement('div');
    info.className = 'preview-info';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'preview-title';
    title.textContent = album.name;
    title.title = album.name; // For tooltip on hover
    
    // Add artist
    const artist = document.createElement('div');
    artist.className = 'preview-artist';
    artist.textContent = album.artist;
    artist.title = album.artist; // For tooltip on hover
    
    // Add stats if available
    if (album.tracks_count !== undefined) {
      const stats = document.createElement('div');
      stats.className = 'preview-stats';
      stats.textContent = `${album.tracks_with_previews}/${album.tracks_count} tracks with previews`;
      info.appendChild(stats);
    }
    
    // Add tracks
    const tracksList = document.createElement('div');
    tracksList.className = 'preview-tracks';
    
    // Only show up to 3 tracks in the card
    const tracksToShow = album.tracks.slice(0, 3);
    
    tracksToShow.forEach(track => {
      const trackItem = document.createElement('div');
      trackItem.className = 'preview-track';
      trackItem.textContent = track.name;
      trackItem.title = track.name; // For tooltip on hover
      
      // Play track on click
      trackItem.addEventListener('click', () => {
        // Play the preview
        audioPlayer.src = track.preview_url;
        audioPlayer.play();
        
        // Update UI
        startPlayback();
        showNotification(`Playing preview: ${track.name}`);
      });
      
      tracksList.appendChild(trackItem);
    });
    
    if (album.tracks.length > 3) {
      const more = document.createElement('div');
      more.className = 'preview-track';
      more.textContent = `+ ${album.tracks.length - 3} more tracks`;
      tracksList.appendChild(more);
    }
    
    // Add elements to info
    info.appendChild(title);
    info.appendChild(artist);
    info.appendChild(tracksList);
    
    // Add image and info to card
    card.appendChild(image);
    card.appendChild(info);
    
    // Add click handler to load album if it has an ID
    if (album.id) {
      card.addEventListener('click', async (event) => {
        // Only trigger for the card itself, not the tracks
        if (!event.target.closest('.preview-track')) {
          try {
            currentAlbum = await apiRequest(`/album/${album.id}`);
            updateAlbumDisplay(currentAlbum);
            createTrackList(currentAlbum.tracks.items);
            stopPlayback();
            transportPlayPauseBtn.disabled = false;
            showNotification('Album loaded! Click the record to play.');
          } catch (error) {
            console.error('Error loading album:', error);
            showNotification('Error loading album');
          }
        }
      });
    }
    
    return card;
  }
  
  /**
   * Handle play/pause toggle
   */
  function handlePlayPauseToggle() {
    if (!currentAlbum) return;
    
    if (isPlaying) {
      pausePlayback();
    } else {
      if (currentTrack) {
        resumePlayback();
      } else if (currentAlbum.tracks.items.length > 0) {
        playTrack(currentAlbum.tracks.items[0], 0);
      }
    }
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
      
      // Log preview availability for debugging
      const tracksWithPreviews = currentAlbum.tracks.items.filter(track => track.preview_url).length;
      console.log(`Album: ${currentAlbum.name}`);
      console.log(`Tracks with previews: ${tracksWithPreviews}/${currentAlbum.tracks.items.length}`);
      console.log('Sample track preview URL:', currentAlbum.tracks.items[0]?.preview_url || 'none');
      
      // Update UI with album details
      updateAlbumDisplay(currentAlbum);
      
      // Create track listing
      createTrackList(currentAlbum.tracks.items);
      
      // Don't auto-play, just set up the vinyl to be ready
      stopPlayback();
      
      // Enable transport button
      transportPlayPauseBtn.disabled = false;
      
      // Create a notification
      showNotification('Album loaded! Click the record to play.');
      
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
      
      // Create left side with preview indicator
      const leftSide = document.createElement('div');
      leftSide.style.display = 'flex';
      leftSide.style.alignItems = 'center';
      
      // Add preview availability indicator
      const previewIndicator = document.createElement('span');
      previewIndicator.classList.add('track-preview-status');
      if (track.preview_url) {
        previewIndicator.classList.add('track-preview-available');
        previewIndicator.title = 'Preview available';
      } else {
        previewIndicator.classList.add('track-preview-unavailable');
        previewIndicator.title = 'No preview available - will play vinyl sound';
      }
      
      const trackTitle = document.createElement('span');
      trackTitle.textContent = `${index + 1}. ${track.name}`;
      
      leftSide.appendChild(previewIndicator);
      leftSide.appendChild(trackTitle);
      
      // Create right side with duration
      const rightSide = document.createElement('span');
      rightSide.textContent = formatDuration(track.duration_ms);
      
      // Add elements to track
      trackElement.appendChild(leftSide);
      trackElement.appendChild(rightSide);
      
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
    
    // Start visual playback
    startPlayback();
    
    // Enable transport button
    transportPlayPauseBtn.disabled = false;
    transportPlayPauseBtn.classList.add('paused');
    playAlbumBtn.classList.add('pause');
    playAlbumBtn.classList.remove('play');
    
    console.log('Track details:', {
      name: track.name,
      hasPreview: !!track.preview_url,
      previewUrl: track.preview_url || 'none'
    });
    
    // Check if track has a preview URL
    if (track.preview_url) {
      // Set source and play
      audioPlayer.src = track.preview_url;
      audioPlayer.play()
        .then(() => {
          // Already started visual playback
          console.log('Preview playing successfully');
        })
        .catch(error => {
          console.error('Playback error:', error);
          console.log('Track information:', track);
          
          // Fall back to vinyl sounds
          playVinylSound();
          
          // Show notification
          showNotification('Using simulated vinyl sound instead of preview');
        });
    } else {
      console.log('No preview URL available for track:', track.name);
      
      // Play vinyl sound effect instead
      playVinylSound();
      
      // Show notification
      showNotification('No preview available - enjoying vinyl sounds instead');
    }
  }
  
  /**
   * Play vinyl crackling sound as fallback
   */
  function playVinylSound() {
    // If we had a previous audio source, pause it
    if (audioPlayer.src) {
      audioPlayer.pause();
    }
    
    // Create vinyl crackling sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a buffer source for noise
    const bufferSize = audioContext.sampleRate * 2; // 2 seconds of audio
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with noise with vinyl-like characteristics
    for (let i = 0; i < bufferSize; i++) {
      // Less noisy than pure white noise
      data[i] = (Math.random() * 2 - 1) * 0.03;
      
      // Add occasional pops and crackles
      if (Math.random() > 0.9995) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
    }
    
    const vinylSource = audioContext.createBufferSource();
    vinylSource.buffer = buffer;
    
    // Add lowpass filter to make it sound more like vinyl
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5000;
    
    // Connect to output
    vinylSource.connect(filter);
    filter.connect(audioContext.destination);
    
    // Start playing and loop
    vinylSource.loop = true;
    vinylSource.start();
    
    // Store for later reference
    window.vinylSource = vinylSource;
    window.audioContext = audioContext;
    
    // Stop after track duration or default to 3 minutes
    const duration = currentTrack.duration_ms || 180000;
    setTimeout(() => {
      if (window.vinylSource) {
        window.vinylSource.stop();
        window.vinylSource = null;
        
        // Move to next track
        handleTrackEnded();
      }
    }, duration);
  }
  
  /**
   * Display a notification message
   * @param {string} message - The message to display
   */
  function showNotification(message) {
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
  
  /**
   * Start playback visual effects
   */
  function startPlayback() {
    isPlaying = true;
    vinyl.classList.add('spinning');
    tonearm.classList.add('playing');
  }
  
  /**
   * Pause playback
   */
  function pausePlayback() {
    // Pause audio
    audioPlayer.pause();
    
    // Pause vinyl sound if playing
    if (window.vinylSource && window.audioContext) {
      window.vinylSource.playbackRate.value = 0;
      // Some browsers may not support suspend
      if (window.audioContext.suspend) {
        window.audioContext.suspend();
      }
    }
    
    // Update UI
    isPlaying = false;
    vinyl.classList.remove('spinning');
    
    // Update buttons
    transportPlayPauseBtn.classList.remove('paused');
    playAlbumBtn.classList.remove('pause');
    playAlbumBtn.classList.add('play');
    
    showNotification('Playback paused');
  }
  
  /**
   * Resume playback
   */
  function resumePlayback() {
    // Resume normal audio if available
    if (audioPlayer.src && audioPlayer.src !== '') {
      audioPlayer.play()
        .then(() => {
          console.log('Resumed audio playback');
        })
        .catch(error => {
          console.error('Error resuming audio:', error);
        });
    }
    
    // Resume vinyl sound if applicable
    if (window.vinylSource && window.audioContext) {
      window.vinylSource.playbackRate.value = 1;
      // Some browsers may not support resume
      if (window.audioContext.resume) {
        window.audioContext.resume();
      }
    }
    
    // Update UI
    startPlayback();
    
    // Update buttons
    transportPlayPauseBtn.classList.add('paused');
    playAlbumBtn.classList.add('pause');
    playAlbumBtn.classList.remove('play');
    
    showNotification('Playback resumed');
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