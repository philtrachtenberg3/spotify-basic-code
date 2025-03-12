/**
 * Authentication Module
 * Handles Spotify authentication flow and token management
 */

// Add at the top of public/js/auth.js
console.log('Auth.js is loading');

// Auth state
let authState = {
    authenticated: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: 0,
    profile: null
  };
  
  /**
   * Initialize authentication
   * Check if user is already authenticated
   * @returns {Promise<Object>} Auth state
   */
  async function initAuth() {
    try {
      const response = await fetch('/auth/check');
      const data = await response.json();
      
      if (data.authenticated) {
        authState.authenticated = true;
        authState.accessToken = data.access_token;
        authState.refreshToken = data.refresh_token;
        
        // If token is expired, refresh it
        if (data.expired) {
          await refreshToken();
        } else {
          // Try to get user profile
          await getUserProfile();
        }
      }
      
      // Update UI based on auth state
      updateAuthUI();
      
      return authState;
    } catch (error) {
      console.error('Error initializing auth:', error);
      authState.authenticated = false;
      updateAuthUI();
      return authState;
    }
  }

  function debugAuthState() {
    console.log("Auth state:", window.spotifyAuth.getAuthState());
    console.log("Cookies:", document.cookie);
  }

  // set up the window.spotifyAuth object
  window.spotifyAuth = {
    initAuth,
    login,
    logout,
    getAuthState,
    spotifyApiRequest
  };

  debugAuthState();
  
  /**
   * Login with Spotify
   */
  function login() {
    console.log('Login button clicked, redirecting to /auth/login');
    window.location.href = '/auth/login';
  }
  
  /**
   * Logout from Spotify
   */
  async function logout() {
    try {
      await fetch('/auth/logout');
      authState = {
        authenticated: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: 0,
        profile: null
      };
      updateAuthUI();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
  
  /**
   * Refresh the access token
   * @returns {Promise<boolean>} Success status
   */
  async function refreshToken() {
    try {
      const response = await fetch('/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: authState.refreshToken })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Token refresh error:', data.error);
        authState.authenticated = false;
        updateAuthUI();
        return false;
      }
      
      authState.accessToken = data.access_token;
      authState.expiresAt = data.expires_at;
      
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }
  
  /**
   * Get the user's Spotify profile
   * @returns {Promise<Object|null>} User profile or null
   */
  async function getUserProfile() {
    try {
      const response = await fetch('/auth/profile');
      
      if (response.status === 401) {
        // Token expired, try refreshing
        const refreshed = await refreshToken();
        if (refreshed) {
          return getUserProfile();
        }
        return null;
      }
      
      const profile = await response.json();
      authState.profile = profile;
      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  /**
   * Get the current auth state
   * @returns {Object} Auth state
   */
  function getAuthState() {
    return authState;
  }
  
  /**
   * Update UI based on authentication state
   */
  function updateAuthUI() {
    console.log("Updating Auth UI with state:", authState);
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const userInfo = document.getElementById('userInfo');
    
    if (authState.authenticated) {
      // User is logged in
      if (loginButton) loginButton.style.display = 'none';
      if (logoutButton) logoutButton.style.display = 'block';
      
      if (userInfo && authState.profile) {
        userInfo.innerHTML = `
          <div class="user-profile">
            ${authState.profile.images && authState.profile.images.length > 0 
              ? `<img src="${authState.profile.images[0].url}" class="profile-image" alt="Profile">`
              : '<div class="profile-image-placeholder"></div>'
            }
            <div class="profile-name">${authState.profile.display_name || 'Spotify User'}</div>
          </div>
        `;
        userInfo.style.display = 'block';
      }
    } else {
      // User is logged out
      if (loginButton) loginButton.style.display = 'block';
      if (logoutButton) logoutButton.style.display = 'none';
      if (userInfo) userInfo.style.display = 'none';
    }
  }
  
  /**
   * Make authenticated Spotify API request
   * Handles token refresh if needed
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async function spotifyApiRequest(endpoint, options = {}) {
    if (!authState.authenticated) {
      throw new Error('Not authenticated');
    }
    
    // Check if token is expired and refresh if needed
    if (Date.now() > authState.expiresAt) {
      const refreshed = await refreshToken();
      if (!refreshed) {
        throw new Error('Failed to refresh token');
      }
    }
    
    // Set up headers with access token
    const headers = {
      'Authorization': `Bearer ${authState.accessToken}`,
      ...options.headers
    };
    
    // Make the request
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers
    });
    
    // Handle 401 Unauthorized (token expired)
    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Try again with new token
        headers.Authorization = `Bearer ${authState.accessToken}`;
        return fetch(`https://api.spotify.com/v1${endpoint}`, {
          ...options,
          headers
        });
      } else {
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    return response;
  }
  
  // Export functions
  console.log("Setting up window.spotifyAuth...");
  window.spotifyAuth = {
    initAuth,
    login,
    logout,
    getAuthState,
    spotifyApiRequest
  };
  console.log("window.spotifyAuth has been set:", window.spotifyAuth);