/**
 * Main application initialization and event handling
 * Updated to reduce annoying auto-updates and ensure proper dashboard initialization
 */

class App {
    constructor() {
        this.isInitialized = false;
        this.autoRefreshInterval = null;
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
            // Ensure dashboard is available before proceeding
            if (typeof dashboard === 'undefined') {
                console.error('Dashboard not available, retrying in 100ms...');
                setTimeout(() => this.start(), 100);
                return;
            }

            Utils.showMessage('Loading data...', CONFIG.MESSAGE_TYPES.SUCCESS);
            
            // Load audio files mapping first (now supports all formats)
            await api.loadAudioFiles(); // Updated from loadMp3Files()
            
            // Load initial data
            await Promise.all([
                dashboard.loadHealth(),
                dashboard.loadStats(),
                dashboard.loadSpaces()
            ]);

            this.setupEventListeners();
            this.isInitialized = true;
            
            this.autoRefreshInterval = setInterval(() => {
                if (document.visibilityState === 'visible' && window.dashboard) {
                    dashboard.refreshAll();
                }
            }, 30000);
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
                Utils.debounce(() => {
                    if (window.dashboard) {
                        dashboard.loadSpaces();
                    }
                }, 300)
            );
        }

        if (limitFilter) {
            limitFilter.addEventListener('change', 
                Utils.debounce(() => {
                    if (window.dashboard) {
                        dashboard.loadSpaces();
                    }
                }, 300)
            );
        }

        // Handle online/offline status
        window.addEventListener('online', () => {
            Utils.showMessage('Connection restored', CONFIG.MESSAGE_TYPES.SUCCESS);
            // Only refresh if user manually requests or if auto-refresh is enabled
            if (this.autoRefreshEnabled && window.dashboard) {
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
                if (this.autoRefreshEnabled && window.dashboard) {
                    this.visibilityRefreshTimeout = setTimeout(() => {
                        dashboard.refreshAll();
                    }, 30000); // 30 second delay
                }
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
     * Updated status method to include audio format information
     */
    getStatus() {
        const audioMap = window.api ? api.getAudioFilesMap() : {};
        const formatCounts = {};
        
        // Count files by format
        Object.values(audioMap).forEach(audioInfo => {
            const format = audioInfo.format || 'unknown';
            formatCounts[format] = (formatCounts[format] || 0) + 1;
        });
        
        return {
            isInitialized: this.isInitialized,
            autoRefreshEnabled: this.autoRefreshEnabled,
            spacesCount: window.dashboard ? dashboard.allSpaces.length : 0,
            audioFilesCount: Object.keys(audioMap).length,
            formatBreakdown: formatCounts,
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