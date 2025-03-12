# Virtual Vinyl Player (Node.js)

A web application that simulates a vinyl record player using the Spotify Web API, with a Node.js backend for secure API integration.

## Features

- Search for artists and browse their albums
- Visual turntable with spinning vinyl record and moving tonearm
- Display album artwork on the vinyl record
- View and play tracks from selected albums
- Automatic track progression

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Spotify Developer Account with an application registered

## Setup

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with your Spotify credentials:
   ```
   CLIENT_ID=your_spotify_client_id
   CLIENT_SECRET=your_spotify_client_secret
   PORT=3000
   ```
4. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
vinyl-player/
├── server/                  # Server-side code
│   ├── server.js            # Main server file
│   ├── routes/              # API routes
│   │   └── spotify.js       # Spotify API routes
│   └── controllers/         # Route controllers
│       └── spotify.js       # Spotify API controller functions
├── public/                  # Client-side code (served as static files)
│   ├── index.html           # Main HTML file
│   ├── css/
│   │   └── style.css        # Styles for the application
│   ├── js/
│   │   └── app.js           # Client-side application logic
│   └── assets/
│       └── images/          # Optional folder for any additional images
├── .env                     # Environment variables (not in version control)
├── package.json             # Project dependencies and scripts
└── README.md                # Project documentation
```

## How It Works

1. The Node.js server handles the Spotify API authentication securely
2. API endpoints are provided to the frontend for artist search, album retrieval, etc.
3. The frontend communicates with these endpoints to populate the UI
4. Spotify preview URLs are used for playback

## Security Benefits

- Spotify API credentials are kept secure on the server
- Token management is handled server-side
- No credentials are exposed to the client

## Limitations

- The Spotify Web API provides only 30-second preview clips for tracks
- Some tracks may not have preview URLs available

## Future Improvements

- Add user authentication with Spotify
- Implement full track playback for premium users
- Add volume control
- Implement a draggable tonearm to select playback position
- Add playlist creation functionality

## Troubleshooting

- If you get authentication errors, check your `.env` file for correct credentials
- Make sure your Spotify Developer application has the correct redirect URIs set
- Check the server console for detailed error messages

## License

This project is provided as-is with no warranties.