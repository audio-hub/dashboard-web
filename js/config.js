/**
 * Configuration constants for the Twitter Spaces Dashboard
 */

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'https://e5oi1540h9.execute-api.us-east-2.amazonaws.com/prod/',
    
    // S3 Configuration
    S3_BASE_URL: 'https://spaces-api-audio-files-985923204742-us-east-2.s3.us-east-2.amazonaws.com/',
    
    // UI Configuration
    DEFAULT_LIMIT: 10,
    MESSAGE_TIMEOUT: 5000, // 5 seconds
    
    // Status types
    STATUS_TYPES: {
        LIVE: 'live',
        ENDED: 'ended'
    },
    
    // Message types
    MESSAGE_TYPES: {
        ERROR: 'error',
        SUCCESS: 'success'
    }
};

// Make CONFIG globally available
window.CONFIG = CONFIG;
