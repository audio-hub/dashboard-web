/**
 * Main application initialization and event handling
 */

class App {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.start());
            } else {
                await this.start();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            Utils.showMessage('Failed to initialize application');
        }
    }

    /**
     * Start the application
     */
    async start() {
        if (this.isInitialized) return;

        try {
            Utils.showMessage('Loading data...', CONFIG.MESSAGE_TYPES.SUCCESS);
            
            // Load MP3 files mapping first
            await api.loadMp3Files();
            
            // Load initial data
            await Promise.all([
                dashboard.loadStats(),
                dashboard.loadSpaces()
            ]);

            this.setupEventListeners();
            this.isInitialized = true;
            
            console.log('Twitter Spaces Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to start application:', error);
            Utils.showMessage(`Failed to load initial data: ${error.message}`);
        }
    }

    /**
     * Set up event listeners for the application
     */
    setupEventListeners() {
        // Filter change listeners with debouncing
        const statusFilter = Utils.getElementById('statusFilter');
        const limitFilter = Utils.getElementById('limitFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', 
                Utils.debounce(() => dashboard.loadSpaces(), 300)
            );
        }

        if (limitFilter) {
            limitFilter.addEventListener('change', 
                Utils.debounce(() => dashboard.loadSpaces(), 300)
            );
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + R to refresh (prevent default browser refresh)
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                dashboard.refreshAll();
            }
            
            // Ctrl/Cmd + D for debug
            if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
                event.preventDefault();
                dashboard.debugMapping();
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            Utils.showMessage('Connection restored', CONFIG.MESSAGE_TYPES.SUCCESS);
            dashboard.refreshAll();
        });

        window.addEventListener('offline', () => {
            Utils.showMessage('Connection lost - some features may not work');
        });

        // Handle page visibility changes (reload data when tab becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                // Refresh data when tab becomes visible (user returned to tab)
                setTimeout(() => dashboard.refreshAll(), 1000);
            }
        });

        console.log('Event listeners set up successfully');
    }

    /**
     * Handle application errors
     * @param {Error} error - The error to handle
     * @param {string} context - Context where the error occurred
     */
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        Utils.showMessage(`Error in ${context}: ${error.message}`);
        
        // Could add error reporting here
        // this.reportError(error, context);
    }

    /**
     * Get application status
     * @returns {Object} Application status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            spacesCount: dashboard.allSpaces.length,
            mp3FilesCount: Object.keys(api.getMp3FilesMap()).length,
            timestamp: new Date().toISOString()
        };
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Utils.showMessage('An unexpected error occurred');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Utils.showMessage('An unexpected error occurred');
});

// Initialize the application
const app = new App();

// Make app globally available for debugging
window.app = app;

// Auto-load data when page loads (legacy compatibility)
window.addEventListener('load', async () => {
    // This ensures compatibility if the old load event is still expected
    if (!app.isInitialized) {
        await app.start();
    }
});
