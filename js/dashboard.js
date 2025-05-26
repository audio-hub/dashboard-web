/**
 * Dashboard management for the Twitter Spaces Dashboard
 * Enhanced with chronological sorting functionality
 */

class Dashboard {
    constructor() {
        this.allSpaces = [];
        this.statsSection = null;
        this.statsGrid = null;
        this.spacesContent = null;
        this.statusFilter = null;
        this.limitFilter = null;
        this.init();
    }

    /**
     * Initialize dashboard elements
     */
    init() {
        this.statsSection = Utils.getElementById('stats-section');
        this.statsGrid = Utils.getElementById('statsGrid');
        this.spacesContent = Utils.getElementById('spacesContent');
        this.statusFilter = Utils.getElementById('statusFilter');
        this.limitFilter = Utils.getElementById('limitFilter');
    }

    /**
     * Loads statistics from the API and displays them.
     */
    async loadStats() {
        try {
            const data = await api.getStats();
            this.displayStats(data.data);
            if (this.statsSection) {
                this.statsSection.style.display = 'block';
            }
        } catch (error) {
            Utils.showMessage(`Failed to load stats: ${error.message}`);
            console.error('Stats error:', error);
        }
    }

    /**
     * Displays the fetched statistics in the dashboard.
     * @param {Object} stats - The statistics data.
     */
    displayStats(stats) {
        if (!this.statsGrid) return;

        this.statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.overview.totalSpaces}</div>
                <div class="stat-label">Total Spaces</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.overview.liveSpaces}</div>
                <div class="stat-label">Live Spaces</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.overview.totalParticipants}</div>
                <div class="stat-label">Total Participants</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.activity.recentSpaces}</div>
                <div class="stat-label">Recent (24h)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.overview.recordingCapable}</div>
                <div class="stat-label">Recording Capable</div>
            </div>
        `;
    }

    /**
     * Loads Twitter Spaces data from the API based on filters and displays them.
     */
    async loadSpaces() {
        if (!this.spacesContent) return;

        this.spacesContent.innerHTML = '<div class="loading">Loading spaces...</div>';

        try {
            const filters = this.getFilterValues();
            const data = await api.getSpaces(filters);
            this.allSpaces = data.data; // Store for debugging
            
            // Sort spaces before displaying
            const sortedSpaces = this.sortSpaces(data.data);
            this.displaySpaces(sortedSpaces);
        } catch (error) {
            this.spacesContent.innerHTML = `<div class="error">Failed to load spaces: ${error.message}</div>`;
            console.error('Spaces error:', error);
        }
    }

    /**
     * Sorts spaces with live spaces first, then chronologically
     * @param {Array<Object>} spaces - Array of space objects
     * @returns {Array<Object>} Sorted array of spaces
     */
    sortSpaces(spaces) {
        if (!spaces || !Array.isArray(spaces)) return [];

        return spaces.sort((a, b) => {
            // First priority: Live spaces come first
            if (a.isLive && !b.isLive) return -1;
            if (!a.isLive && b.isLive) return 1;

            // Second priority: Sort by date
            // For live spaces: most recently started first
            // For ended spaces: most recently ended first
            const dateA = this.getRelevantDate(a);
            const dateB = this.getRelevantDate(b);

            // Sort in descending order (newest first)
            return new Date(dateB) - new Date(dateA);
        });
    }

    /**
     * Gets the most relevant date for sorting a space
     * @param {Object} space - Space object
     * @returns {string} Date string
     */
    getRelevantDate(space) {
        // Priority order for date selection:
        // 1. lastUpdated (most current activity)
        // 2. endedAt (for ended spaces)
        // 3. startedAt (when the space began)
        // 4. createdAt (fallback)
        return space.lastUpdated || 
               space.endedAt || 
               space.startedAt || 
               space.createdAt || 
               new Date(0).toISOString(); // Fallback to epoch if no date available
    }

    /**
     * Gets current filter values from the UI
     * @returns {Object} Filter values
     */
    getFilterValues() {
        return {
            status: this.statusFilter?.value || '',
            limit: this.limitFilter?.value || CONFIG.DEFAULT_LIMIT
        };
    }

    /**
     * Enhanced space display with better MP3 matching and sorting indicators.
     * @param {Array<Object>} spaces - An array of Twitter Space objects.
     */
    displaySpaces(spaces) {
        if (!this.spacesContent) return;

        if (!spaces || spaces.length === 0) {
            this.spacesContent.innerHTML = '<div class="loading">No spaces found</div>';
            return;
        }

        // Add sorting info header
        const liveCount = spaces.filter(s => s.isLive).length;
        const endedCount = spaces.length - liveCount;
        
        let sortingInfo = '';
        if (liveCount > 0 && endedCount > 0) {
            sortingInfo = `<div class="sorting-info">Showing ${liveCount} live spaces first, then ${endedCount} ended spaces (most recent first)</div>`;
        } else if (liveCount > 0) {
            sortingInfo = `<div class="sorting-info">Showing ${liveCount} live spaces (most recent first)</div>`;
        } else if (endedCount > 0) {
            sortingInfo = `<div class="sorting-info">Showing ${endedCount} ended spaces (most recent first)</div>`;
        }

        this.spacesContent.innerHTML = sortingInfo + spaces.map(space => {
            const host = space.host?.username || '';
            const title = space.title || '';
            const possibleKeys = api.getMappingKeys(host, title);
            const mp3Url = api.getMp3Url(host, title);
            const foundKey = possibleKeys.find(key => api.getMp3FilesMap()[key]);
            
            return this.createSpaceItemHTML(space, mp3Url, foundKey);
        }).join('');
    }

    /**
     * Creates HTML for a single space item with enhanced date display
     * @param {Object} space - Space object
     * @param {string|null} mp3Url - MP3 URL if available
     * @param {string|null} foundKey - The key that was matched
     * @returns {string} HTML string
     */
    createSpaceItemHTML(space, mp3Url, foundKey) {
        const relevantDate = this.getRelevantDate(space);
        const timeDisplay = this.formatTimeDisplay(space, relevantDate);
        
        return `
            <div class="space-item">
                <div class="space-title">${space.title || 'Untitled Space'}</div>
                <div class="space-host">
                    🎙️ ${space.host?.displayName || space.host?.username || 'Unknown Host'}
                    ${space.host?.username ? `(@${space.host.username})` : ''}
                </div>
                <div class="space-meta">
                    <span class="space-badge ${space.isLive ? 'badge-live' : 'badge-ended'}">
                        ${space.isLive ? '🔴 LIVE' : '⚫ ENDED'}
                    </span>
                    <span class="space-badge badge-participants">
                        👥 ${space.participantCount || 0} participants
                    </span>
                    <span class="space-badge badge-time">
                        ${timeDisplay}
                    </span>
                    ${space.recordingStatus ? `<span class="space-badge badge-participants">📹 ${space.recordingStatus}</span>` : ''}
                    ${foundKey ? `<span class="space-badge badge-participants">🎧 Audio Available</span>` : ''}
                </div>
                ${foundKey ? `<div class="debug-info">Matched: ${foundKey}</div>` : ''}
                <div class="space-actions">
                    <button class="btn-small" onclick="dashboard.viewSpaceDetails('${space._id}')">View Details</button>
                    <button class="btn-small" onclick="dashboard.viewParticipants('${space._id}')">View Participants</button>
                    ${mp3Url ? `<button class="btn-small" onclick="window.open('${mp3Url}', '_blank')">🎧 Listen</button>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Formats time display based on space status
     * @param {Object} space - Space object
     * @param {string} relevantDate - The relevant date for this space
     * @returns {string} Formatted time display
     */
    formatTimeDisplay(space, relevantDate) {
        const date = new Date(relevantDate);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (space.isLive) {
            if (diffMins < 60) {
                return `🕐 Started ${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `🕐 Started ${diffHours}h ago`;
            } else {
                return `🕐 Started ${diffDays}d ago`;
            }
        } else {
            if (diffMins < 60) {
                return `⏱️ Ended ${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `⏱️ Ended ${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `⏱️ Ended ${diffDays}d ago`;
            } else {
                return `⏱️ ${date.toLocaleDateString()}`;
            }
        }
    }

    /**
     * Fetches and displays detailed information for a specific space.
     * @param {string} spaceId - The ID of the space to view.
     */
    async viewSpaceDetails(spaceId) {
        try {
            const data = await api.getSpaceDetails(spaceId);
            modal.showSpaceDetails(data.data);
        } catch (error) {
            Utils.showMessage(`Failed to load space details: ${error.message}`);
        }
    }

    /**
     * Fetches and displays the list of participants for a specific space.
     * @param {string} spaceId - The ID of the space to view participants for.
     */
    async viewParticipants(spaceId) {
        try {
            const data = await api.getSpaceParticipants(spaceId);
            modal.showParticipants(data.participants || [], data.spaceTitle);
        } catch (error) {
            Utils.showMessage(`Failed to load participants: ${error.message}`);
        }
    }

    /**
     * Debug function to show mapping attempts.
     */
    debugMapping() {
        if (this.allSpaces.length === 0) {
            Utils.showMessage('Load spaces first to debug mapping');
            return;
        }
        
        let debugInfo = 'MP3 MAPPING DEBUG:\n\n';
        const mp3Map = api.getMp3FilesMap();
        debugInfo += `Available MP3 files (${Object.keys(mp3Map).length}):\n`;
        Object.keys(mp3Map).forEach(key => {
            debugInfo += `  ${key}\n`;
        });
        
        debugInfo += '\nSpaces and their mapping attempts:\n';
        this.allSpaces.forEach(space => {
            const host = space.host?.username || '';
            const title = space.title || '';
            const possibleKeys = api.getMappingKeys(host, title);
            const foundKey = possibleKeys.find(key => mp3Map[key]);
            
            debugInfo += `\nSpace: "${title}" by @${host}\n`;
            debugInfo += `  Keys tried: ${possibleKeys.join(', ')}\n`;
            debugInfo += `  Match found: ${foundKey ? 'YES (' + foundKey + ')' : 'NO'}\n`;
        });
        
        modal.showDebugInfo(debugInfo);
    }

    /**
     * Refreshes all dashboard data
     */
    async refreshAll() {
        Utils.showMessage('Refreshing all data...', CONFIG.MESSAGE_TYPES.SUCCESS);
        try {
            await api.loadMp3Files();
            await this.loadStats();
            await this.loadSpaces();
        } catch (error) {
            Utils.showMessage(`Failed to refresh data: ${error.message}`);
        }
    }
}

// Create global instance
const dashboard = new Dashboard();
window.dashboard = dashboard;