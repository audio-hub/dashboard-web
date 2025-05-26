/**
 * Configuration constants for the Twitter Spaces Dashboard
 */

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'https://w7aws2f0oi.execute-api.us-east-2.amazonaws.com/prod/',
    
    // S3 Configuration
    S3_BASE_URL: 'https://twitter-spaces-audio-streams-865712988605.s3.us-east-2.amazonaws.com/',
    
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
