# 🎙️ Twitter Spaces Dashboard

A modern, responsive web dashboard for monitoring and exploring Twitter Spaces activity with audio playback capabilities.

## ✨ Features

- **Real-time Stats** - Monitor total spaces, live spaces, participants, and recent activity
- **Spaces Browser** - View and filter Twitter Spaces with detailed information
- **Audio Playback** - Listen to recorded spaces directly from the dashboard
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Debug Tools** - Built-in debugging for MP3 file mapping and data inspection
- **Live Filtering** - Filter spaces by status (live/ended) and limit results
- **Modal Details** - View detailed space information and participant lists

## 🚀 Live Demo

Visit the live dashboard: [https://your-username.github.io/twitter-spaces-dashboard/](https://your-username.github.io/twitter-spaces-dashboard/)

## 📁 Project Structure

```
twitter-spaces-dashboard/
├── index.html              # Main entry point
├── css/
│   └── styles.css          # All styling
└── js/
    ├── config.js           # Configuration constants
    ├── utils.js            # Utility functions
    ├── api.js              # API communication layer
    ├── modal.js            # Modal management
    ├── dashboard.js        # Dashboard logic
    └── app.js              # Application initialization
```

## 🛠️ Setup & Installation

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/twitter-spaces-dashboard.git
   cd twitter-spaces-dashboard
   ```

2. **Start a local server:**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

### GitHub Pages Deployment

1. **Create a new repository on GitHub**

2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/twitter-spaces-dashboard.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repository Settings
   - Navigate to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click Save

4. **Access your site:**
   ```
   https://your-username.github.io/twitter-spaces-dashboard/
   ```

## ⚙️ Configuration

### API Configuration

Update the API endpoints in `js/config.js`:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-api-endpoint.com/prod/',
    S3_BASE_URL: 'https://your-s3-bucket.s3.region.amazonaws.com/',
    // ... other settings
};
```

### CORS Requirements

Ensure your API server includes proper CORS headers for GitHub Pages:

```
Access-Control-Allow-Origin: https://your-username.github.io
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## 🎮 Usage

### Basic Navigation

- **Refresh Stats** - Click to update dashboard statistics
- **Refresh Spaces** - Click to reload spaces data
- **Debug MP3 Mapping** - View file mapping debug information

### Filtering

- **Status Filter** - Show all spaces, live only, or ended only
- **Limit Filter** - Control number of spaces displayed (10, 25, 50)

### Keyboard Shortcuts

- `Ctrl/Cmd + R` - Refresh all data
- `Ctrl/Cmd + D` - Open debug mapping modal
- `Escape` - Close any open modal

### Space Actions

- **View Details** - See complete space information
- **View Participants** - List all space participants
- **🎧 Listen** - Play recorded audio (when available)

## 🏗️ Architecture

### Modular Design

The application is built with a modular architecture:

- **Separation of Concerns** - Each module has a single responsibility
- **Loose Coupling** - Modules communicate through well-defined interfaces
- **Reusable Components** - Utility functions and API methods are shared
- **Error Handling** - Centralized error management across modules

### Key Classes

- `ApiService` - Handles all API communication and data fetching
- `Dashboard` - Manages space display and user interactions
- `ModalManager` - Controls modal popups and content
- `App` - Coordinates application initialization and lifecycle

## 🔧 Development

### Adding New Features

1. **Create new module** in `js/` directory
2. **Add script tag** to `index.html`
3. **Use existing utilities** from `utils.js`
4. **Follow established patterns** for consistency

### Debugging

Access global objects in browser console:

```javascript
// Application status
app.getStatus()

// API methods
api.getMp3FilesMap()

// Dashboard data
dashboard.allSpaces

// Utility functions
Utils.slugify("Your Text Here")

// Modal controls
modal.open("Title", "Content")
```

### File Structure Guidelines

- **HTML** - Structure and markup only
- **CSS** - All styling in `css/styles.css`
- **JS Modules** - Organized by functionality
- **Config** - Environment settings in `config.js`

## 📊 API Endpoints

The dashboard expects these API endpoints:

- `GET /stats` - Dashboard statistics
- `GET /spaces` - List of spaces with filters
- `GET /spaces/{id}` - Individual space details
- `GET /spaces/{id}/participants` - Space participants
- `GET /files` - Available MP3 files

### Expected Response Format

```javascript
// /stats
{
  "data": {
    "overview": {
      "totalSpaces": 150,
      "liveSpaces": 12,
      "totalParticipants": 1250,
      "recordingCapable": 89
    },
    "activity": {
      "recentSpaces": 45
    }
  }
}

// /spaces
{
  "data": [
    {
      "_id": "space123",
      "title": "Space Title",
      "host": {
        "username": "host_user",
        "displayName": "Host Name"
      },
      "isLive": true,
      "participantCount": 25,
      "createdAt": "2025-05-26T10:00:00Z"
    }
  ]
}
```

## 🎨 Customization

### Styling

Modify `css/styles.css` to customize:

- **Colors** - Update CSS custom properties
- **Layout** - Adjust grid and flexbox properties
- **Typography** - Change font families and sizes
- **Animations** - Modify transitions and transforms

### Branding

Update these elements for custom branding:

- Page title in `index.html`
- Header text and emoji
- Color scheme in CSS
- Favicon (add to root directory)

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure API server has proper CORS headers
   - Check browser console for specific error messages

2. **MP3 Files Not Loading**
   - Verify S3 bucket URL in config
   - Check file naming conventions match mapping logic

3. **GitHub Pages Not Updating**
   - Check Actions tab for deployment status
   - Clear browser cache
   - Verify branch and folder settings

### Debug Mode

Enable verbose logging:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues:

1. Check the browser console for error messages
2. Review the troubleshooting section above
3. Open an issue on GitHub with details about the problem

---

**Built with ❤️ using vanilla JavaScript, CSS3, and HTML5**
