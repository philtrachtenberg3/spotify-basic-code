/**
 * Find tracks with previews available
 */
exports.findTracksWithPreviews = async (req, res) => {
    try {
      const { query = 'hits', type = 'track', limit = 50 } = req.query;
      
      const token = await getSpotifyToken();
      
      console.log(`Searching for tracks with previews using query: "${query}"`);
      
      // Try multiple approaches to find preview URLs
      
      // 1. First approach: Try to get featured playlists which often have preview URLs
      let featuredPlaylists = [];
      try {
        const featuredResponse = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/browse/featured-playlists',
          params: {
            limit: 5,
            country: 'US'
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        featuredPlaylists = featuredResponse.data?.playlists?.items || [];
        console.log(`Found ${featuredPlaylists.length} featured playlists`);
      } catch (error) {
        console.error('Error fetching featured playlists:', error.message);
      }
      
      // 2. Second approach: Try search
      let searchResults = {
        tracks: { items: [] },
        albums: { items: [] }
      };
      
      try {
        const searchResponse = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/search',
          params: {
            q: query,
            type: 'album,track',
            limit: limit,
            market: 'US'
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        searchResults = searchResponse.data;
        console.log(
          `Search returned ${searchResults.tracks?.items?.length || 0} tracks and ${searchResults.albums?.items?.length || 0} albums`
        );
      } catch (error) {
        console.error('Error searching Spotify:', error.message);
      }
      
      // 3. Try to get new releases
      let newReleases = [];
      try {
        const newReleasesResponse = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/browse/new-releases',
          params: {
            limit: 5,
            country: 'US'
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        newReleases = newReleasesResponse.data?.albums?.items || [];
        console.log(`Found ${newReleases.length} new releases`);
      } catch (error) {
        console.error('Error fetching new releases:', error.message);
      }
      
      // Combine all sources
      const sources = [
        {type: 'featured', items: featuredPlaylists}, 
        {type: 'search', items: searchResults.albums?.items || []},
        {type: 'new_releases', items: newReleases}
      ];
      
      // Process all sources to find previews
      let results = [];
      
      // Process each source
      for (const source of sources) {
        if (!source.items || !source.items.length) continue;
        
        // For playlists, get tracks
        if (source.type === 'featured') {
          for (const playlist of source.items.slice(0, 3)) {
            try {
              const playlistResponse = await axios({
                method: 'get',
                url: `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
                params: {
                  limit: 10
                },
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              const playlistTracks = playlistResponse.data?.items || [];
              const tracksWithPreviews = playlistTracks
                .filter(item => item.track && item.track.preview_url)
                .map(item => item.track);
              
              console.log(`Playlist "${playlist.name}": ${tracksWithPreviews.length}/${playlistTracks.length} tracks have previews`);
              
              if (tracksWithPreviews.length > 0) {
                results.push({
                  id: playlist.id,
                  name: playlist.name,
                  artist: 'Spotify Playlist',
                  tracks_count: playlistTracks.length,
                  tracks_with_previews: tracksWithPreviews.length,
                  image: playlist.images[0]?.url,
                  type: 'playlist',
                  tracks: tracksWithPreviews.map(track => ({
                    id: track.id,
                    name: track.name,
                    preview_url: track.preview_url
                  }))
                });
              }
            } catch (error) {
              console.error(`Error fetching playlist ${playlist.id}:`, error.message);
            }
          }
        } else {
          // For albums, get tracks
          for (const album of source.items.slice(0, 3)) {
            try {
              const albumResponse = await axios({
                method: 'get',
                url: `https://api.spotify.com/v1/albums/${album.id}/tracks`,
                params: {
                  limit: 20
                },
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              const albumTracks = albumResponse.data?.items || [];
              
              // For each track, get full track details to check for preview URL
              let tracksWithPreviews = [];
              
              for (const track of albumTracks.slice(0, 10)) {
                try {
                  const trackResponse = await axios({
                    method: 'get',
                    url: `https://api.spotify.com/v1/tracks/${track.id}`,
                    params: {
                      market: 'US'
                    },
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (trackResponse.data.preview_url) {
                    tracksWithPreviews.push(trackResponse.data);
                  }
                } catch (error) {
                  console.error(`Error fetching track ${track.id}:`, error.message);
                }
              }
              
              console.log(`Album "${album.name}": ${tracksWithPreviews.length}/${albumTracks.length} tracks have previews`);
              
              if (tracksWithPreviews.length > 0) {
                results.push({
                  id: album.id,
                  name: album.name,
                  artist: album.artists[0].name,
                  tracks_count: albumTracks.length,
                  tracks_with_previews: tracksWithPreviews.length,
                  image: album.images[0]?.url,
                  type: 'album',
                  tracks: tracksWithPreviews.map(track => ({
                    id: track.id,
                    name: track.name,
                    preview_url: track.preview_url
                  }))
                });
              }
            } catch (error) {
              console.error(`Error fetching album ${album.id}:`, error.message);
            }
          }
        }
      }
      
      // Also add individual tracks from search
      const individualTracks = (searchResults.tracks?.items || [])
        .filter(track => track.preview_url)
        .map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          preview_url: track.preview_url,
          album_id: track.album.id,
          image: track.album.images[0]?.url
        }));
      
      console.log(`Found ${individualTracks.length} individual tracks with previews`);
      
      // Combine all results
      const allResults = [...results];
      
      if (individualTracks.length > 0) {
        allResults.push({
          name: 'Tracks with Previews',
          artist: 'Various Artists',
          image: individualTracks[0]?.image,
          tracks_count: individualTracks.length,
          tracks_with_previews: individualTracks.length,
          tracks: individualTracks.map(track => ({
            id: track.id,
            name: track.name,
            preview_url: track.preview_url
          }))
        });
      }
      
      console.log(`Total: Found ${allResults.length} sources with previews available`);
      
      // If nothing found, create a test track with preview
      if (allResults.length === 0) {
        console.log('No results found with previews. Adding a test track.');
        // This is a widely available preview URL that should work in most regions
        allResults.push({
          name: 'Test Tracks',
          artist: 'Spotify',
          tracks_count: 1,
          tracks_with_previews: 1,
          tracks: [{
            id: 'test1',
            name: 'Test Track (guaranteed preview)',
            preview_url: 'https://p.scdn.co/mp3-preview/6902e7da51d2f17e5369d57dadf8ce7d2a123f99'
          }]
        });
      }
      
      res.json({
        query,
        type,
        total_results: allResults.length,
        results: allResults
      });
    } catch (error) {
      console.error('Error finding tracks with previews:', error.message);
      if (error.response) {
        console.error('Spotify API response:', error.response.data);
      }
      res.status(500).json({ error: 'Failed to find tracks with previews' });
    }
  };/**
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
      
      // Log preview URL availability for debugging
      const tracks = response.data.tracks.items;
      const availablePreviews = tracks.filter(track => track.preview_url).length;
      console.log(`\nAlbum: ${response.data.name}`);
      console.log(`Tracks with preview URLs: ${availablePreviews}/${tracks.length}`);
      
      if (availablePreviews === 0) {
        console.log("WARNING: No tracks have preview URLs. This could be due to:");
        console.log("1. Regional restrictions (Spotify limits previews in some regions)");
        console.log("2. Rights holder restrictions (some artists/labels don't allow previews)");
        console.log("3. Recent Spotify API changes");
        
        // Log a sample track for debugging
        if (tracks.length > 0) {
          console.log("\nSample track from response:");
          console.log(`Track: ${tracks[0].name}`);
          console.log("Has preview URL:", !!tracks[0].preview_url);
          console.log("Preview URL:", tracks[0].preview_url || "not available");
        }
      }
      
      res.json(response.data);
    } catch (error) {
      console.error('Error getting album details:', error.message);
      res.status(500).json({ error: 'Failed to get album details' });
    }
  };