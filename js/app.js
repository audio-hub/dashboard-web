/**
 * Main application initialization and event handling
 * Updated to reduce annoying auto-updates
 */

class App {
    constructor() {
        this.isInitialized = false;
        this.autoRefreshEnabled = false; // Disabled by default
        this.autoRefreshInterval = null;
        this.visibilityRefreshTimeout = null;
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
     * Set up event listeners for the application with reduced auto-refresh
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

            // Ctrl/Cmd + A to toggle auto-refresh
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                event.preventDefault();
                this.toggleAutoRefresh();
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            Utils.showMessage('Connection restored', CONFIG.MESSAGE_TYPES.SUCCESS);
            // Only refresh if user manually requests or if auto-refresh is enabled
            if (this.autoRefreshEnabled) {
                dashboard.refreshAll();
            }
        });

        window.addEventListener('offline', () => {
            Utils.showMessage('Connection lost - some features may not work');
            this.stopAutoRefresh();
        });

        // Handle page visibility changes with longer delay and user control
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                // Clear any existing timeout
                if (this.visibilityRefreshTimeout) {
                    clearTimeout(this.visibilityRefreshTimeout);
                }
                
                // Only auto-refresh if enabled and after a longer delay (30 seconds)
                if (this.autoRefreshEnabled) {
                    this.visibilityRefreshTimeout = setTimeout(() => {
                        dashboard.refreshAll();
                    }, 30000); // 30 second delay
                }
            }
        });

        console.log('Event listeners set up successfully');
    }

    /**
     * Toggle auto-refresh functionality
     */
    toggleAutoRefresh() {
        if (this.autoRefreshEnabled) {
            this.stopAutoRefresh();
            Utils.showMessage('Auto-refresh disabled. Use Ctrl+R or buttons to refresh manually.', CONFIG.MESSAGE_TYPES.SUCCESS);
        } else {
            this.startAutoRefresh();
            Utils.showMessage('Auto-refresh enabled. Press Ctrl+A to disable.', CONFIG.MESSAGE_TYPES.SUCCESS);
        }
    }

    /**
     * Start auto-refresh with longer intervals
     */
    startAutoRefresh() {
        this.autoRefreshEnabled = true;
        
        // Auto-refresh every 5 minutes instead of frequent updates
        this.autoRefreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('Auto-refreshing data...');
                dashboard.refreshAll();
            }
        }, 300000); // 5 minutes = 300,000ms
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        this.autoRefreshEnabled = false;
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        if (this.visibilityRefreshTimeout) {
            clearTimeout(this.visibilityRefreshTimeout);
            this.visibilityRefreshTimeout = null;
        }
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
            autoRefreshEnabled: this.autoRefreshEnabled,
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



