/**
 * Enhanced Dashboard management with spaceId-based MP3 mapping and anchor information
 * Updated to handle host as string, reduce auto-updates, and display anchor data
 */

class Dashboard {
    constructor() {
        this.allSpaces = [];
        this.statsSection = null;
        this.statsGrid = null;
        this.spacesContent = null;
        this.statusFilter = null;
        this.limitFilter = null;
        this.lastRefreshTime = 0;
        this.minRefreshInterval = 10000; // 10 seconds minimum between auto-refreshes
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
     * Constructs X.com URL for a space
     * @param {Object} space - Space object
     * @returns {string|null} X.com URL or null if not constructible
     */
    getSpaceUrl(space) {
        // Try multiple approaches to construct the URL
        
        // Method 1: If we have a direct spaceId
        if (space.spaceId) {
            return `https://x.com/i/spaces/${space.spaceId}`;
        }
        
        // Method 2: If we have _id that looks like a space ID
        if (space._id && space._id.length > 10) {
            return `https://x.com/i/spaces/${space._id}`;
        }
        
        // Method 3: If we have host (now string), try to construct from that
        if (space.host) {
            // This might not always work for ended spaces, but worth trying
            const cleanHost = space.host.replace(/[@]/g, '');
            return `https://x.com/${cleanHost}`;
        }
        
        return null;
    }

    /**
     * Determines the privacy status of a space
     * @param {Object} space - Space object
     * @returns {Object} Privacy information with status and badge details
     */
    getPrivacyInfo(space) {
        // Handle new spaces with explicit private boolean
        if (typeof space.private === 'boolean') {
            return {
                isPrivate: space.private,
                status: space.private ? 'Private' : 'Public',
                badge: space.private ? 'badge-private' : 'badge-public',
                icon: space.private ? '🔒' : '📢',
                tooltip: space.private ? 'Not recorded - Private space' : 'Recorded - Public space'
            };
        }
        
        // Fallback for older spaces without private attribute
        // Try to infer from other indicators
        const hasRecording = space.recordingStatus || space.hlsUrl;
        
        return {
            isPrivate: null, // Unknown
            status: hasRecording ? 'Public (inferred)' : 'Unknown',
            badge: hasRecording ? 'badge-public' : 'badge-unknown',
            icon: hasRecording ? '📢' : '❓',
            tooltip: hasRecording ? 'Likely recorded based on available data' : 'Recording status unknown (older space)'
        };
    }

    /**
     * Gets anchor information for display
     * @param {Object} space - Space object
     * @returns {Object} Anchor information with display details
     */
    getAnchorInfo(space) {
        if (!space.anchor) {
            return {
                hasAnchor: false,
                displayText: 'No anchor',
                tooltip: 'Space was not discovered through following someone',
                badge: 'badge-unknown',
                icon: '❓'
            };
        }

        const { displayName, role } = space.anchor;
        const roleIcons = {
            hosting: '🎙️',
            speaking: '🗣️',
            listening: '👂'
        };
        
        const roleText = {
            hosting: 'hosting',
            speaking: 'speaking',
            listening: 'listening'
        };

        return {
            hasAnchor: true,
            displayText: `${displayName}`,
            role: role,
            roleIcon: roleIcons[role] || '👤',
            roleText: roleText[role] || role,
            tooltip: `Space discovered because you follow ${displayName} who was ${roleText[role] || role}`,
            badge: 'badge-participants',
            icon: '🔗'
        };
    }

    /**
     * Enhanced space display with spaceId-based MP3 mapping, host as string, and anchor information
     * @param {Array<Object>} spaces - An array of Twitter Space objects.
     */
    displaySpaces(spaces) {
        if (!this.spacesContent) return;

        if (!spaces || spaces.length === 0) {
            this.spacesContent.innerHTML = '<div class="loading">No spaces found</div>';
            return;
        }

        // Add sorting info header with privacy and anchor statistics
        const liveCount = spaces.filter(s => s.isLive).length;
        const endedCount = spaces.length - liveCount;
        const privateCount = spaces.filter(s => s.private === true).length;
        const publicCount = spaces.filter(s => s.private === false).length;
        const unknownPrivacyCount = spaces.filter(s => typeof s.private !== 'boolean').length;
        const withAnchorCount = spaces.filter(s => s.anchor).length;
        
        let sortingInfo = '';
        if (liveCount > 0 && endedCount > 0) {
            sortingInfo = `<div class="sorting-info">Showing ${liveCount} live spaces first, then ${endedCount} ended spaces (most recent first)`;
        } else if (liveCount > 0) {
            sortingInfo = `<div class="sorting-info">Showing ${liveCount} live spaces (most recent first)`;
        } else if (endedCount > 0) {
            sortingInfo = `<div class="sorting-info">Showing ${endedCount} ended spaces (most recent first)`;
        }
        
        // Add privacy breakdown
        if (privateCount > 0 || publicCount > 0) {
            sortingInfo += ` • Privacy: ${publicCount} public, ${privateCount} private`;
            if (unknownPrivacyCount > 0) {
                sortingInfo += `, ${unknownPrivacyCount} unknown`;
            }
        } else if (unknownPrivacyCount > 0) {
            sortingInfo += ` • Privacy status unknown for all ${unknownPrivacyCount} spaces (older data)`;
        }

        // Add anchor information
        if (withAnchorCount > 0) {
            sortingInfo += ` • ${withAnchorCount} spaces discovered through following someone`;
        }
        
        sortingInfo += '</div>';

        this.spacesContent.innerHTML = sortingInfo + spaces.map(space => {
            // UPDATED: Use host as string instead of host.username
            const mp3Url = api.getMp3UrlBySpaceId(space._id, space.host, space.createdAt);
            const spaceUrl = this.getSpaceUrl(space);
            const privacyInfo = this.getPrivacyInfo(space);
            const anchorInfo = this.getAnchorInfo(space);
            
            return this.createSpaceItemHTML(space, mp3Url, spaceUrl, privacyInfo, anchorInfo);
        }).join('');
    }

    /**
     * Creates HTML for a single space item with spaceId-based MP3 mapping, host as string, and anchor information
     * @param {Object} space - Space object
     * @param {string|null} mp3Url - MP3 URL if available
     * @param {string|null} spaceUrl - X.com URL for the space
     * @param {Object} privacyInfo - Privacy information object
     * @param {Object} anchorInfo - Anchor information object
     * @returns {string} HTML string
     */
    createSpaceItemHTML(space, mp3Url, spaceUrl, privacyInfo, anchorInfo) {
        const relevantDate = this.getRelevantDate(space);
        const timeDisplay = this.formatTimeDisplay(space, relevantDate);
        
        return `
            <div class="space-item">
                <div class="space-title">${space.title || 'Untitled Space'}</div>
                <div class="space-host">
                    🎙️ ${space.host} 
                    ${anchorInfo.hasAnchor ? `<span style="color: #666; font-size: 0.9em;">• Discovered via ${anchorInfo.roleIcon} ${anchorInfo.displayText} (${anchorInfo.roleText})</span>` : ''}
                </div>
                <div class="space-meta">
                    <span class="space-badge ${space.isLive ? 'badge-live' : 'badge-ended'}">
                        ${space.isLive ? '🔴 LIVE' : '⚫ ENDED'}
                    </span>
                    <span class="space-badge badge-participants">
                        👥 ${space.participantCount || 0} participants
                    </span>
                    <span class="space-badge ${privacyInfo.badge}" title="${privacyInfo.tooltip}">
                        ${privacyInfo.icon} ${privacyInfo.status}
                    </span>
                    ${anchorInfo.hasAnchor ? `<span class="space-badge ${anchorInfo.badge}" title="${anchorInfo.tooltip}">
                        ${anchorInfo.icon} Via ${anchorInfo.roleIcon} ${anchorInfo.displayText}
                    </span>` : `<span class="space-badge badge-unknown" title="Space not discovered through following someone">
                        ❓ No anchor
                    </span>`}
                    <span class="space-badge badge-time">
                        ${timeDisplay}
                    </span>
                    ${space.recordingStatus ? `<span class="space-badge badge-participants">📹 ${space.recordingStatus}</span>` : ''}
                    ${mp3Url ? `<span class="space-badge badge-participants">🎧 Audio Available</span>` : ''}
                </div>
                ${mp3Url ? `<div class="debug-info">Found MP3: ${space._id}.mp3</div>` : `<div class="debug-info">No MP3 found for space ID: ${space._id}</div>`}
                ${privacyInfo.isPrivate === null ? `<div class="debug-info">Privacy status: Inferred from available data (space predates privacy tracking)</div>` : ''}
                ${anchorInfo.hasAnchor ? `<div class="debug-info">Anchor: ${anchorInfo.displayText} was ${anchorInfo.roleText} (why this space was recorded)</div>` : `<div class="debug-info">No anchor info: Space discovery method unknown</div>`}
                <div class="space-actions">
                    ${spaceUrl ? `<button class="btn-small btn-primary" onclick="window.open('${spaceUrl}', '_blank')">🔗 Open on X</button>` : ''}
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
     * Debug function to show spaceId-based mapping attempts, privacy information, and anchor data.
     */
    debugMapping() {
        if (this.allSpaces.length === 0) {
            Utils.showMessage('Load spaces first to debug mapping');
            return;
        }
        
        let debugInfo = 'SPACEID-BASED MP3 MAPPING, PRIVACY & ANCHOR DEBUG:\n\n';
        const mp3Map = api.getMp3FilesMap();
        debugInfo += `Available MP3 files (${Object.keys(mp3Map).length}):\n`;
        Object.keys(mp3Map).forEach(key => {
            debugInfo += `  ${key}\n`;
        });
        
        // Privacy statistics
        const privateSpaces = this.allSpaces.filter(s => s.private === true);
        const publicSpaces = this.allSpaces.filter(s => s.private === false);
        const unknownSpaces = this.allSpaces.filter(s => typeof s.private !== 'boolean');
        
        // Anchor statistics
        const withAnchor = this.allSpaces.filter(s => s.anchor);
        const hostingAnchors = withAnchor.filter(s => s.anchor.role === 'hosting');
        const speakingAnchors = withAnchor.filter(s => s.anchor.role === 'speaking');
        const listeningAnchors = withAnchor.filter(s => s.anchor.role === 'listening');
        
        debugInfo += `\nPrivacy Breakdown:\n`;
        debugInfo += `  Public spaces: ${publicSpaces.length}\n`;
        debugInfo += `  Private spaces: ${privateSpaces.length}\n`;
        debugInfo += `  Unknown/Legacy spaces: ${unknownSpaces.length}\n`;
        
        debugInfo += `\nAnchor Breakdown:\n`;
        debugInfo += `  Spaces with anchor info: ${withAnchor.length}\n`;
        debugInfo += `  Discovered via hosting: ${hostingAnchors.length}\n`;
        debugInfo += `  Discovered via speaking: ${speakingAnchors.length}\n`;
        debugInfo += `  Discovered via listening: ${listeningAnchors.length}\n`;
        debugInfo += `  No anchor info: ${this.allSpaces.length - withAnchor.length}\n`;
        
        debugInfo += '\nSpaces and their spaceId-based mapping:\n';
        this.allSpaces.forEach(space => {
            // UPDATED: Use host as string instead of host.username
            const mp3Url = api.getMp3UrlBySpaceId(space._id, space.host, space.createdAt);
            const spaceUrl = this.getSpaceUrl(space);
            const privacyInfo = this.getPrivacyInfo(space);
            const anchorInfo = this.getAnchorInfo(space);
            
            debugInfo += `\nSpace: "${space.title || 'Untitled'}" by @${space.host || 'unknown'}\n`;
            debugInfo += `  Space ID: ${space._id}\n`;
            debugInfo += `  Privacy: ${privacyInfo.status} (${privacyInfo.tooltip})\n`;
            debugInfo += `  Anchor: ${anchorInfo.hasAnchor ? `${anchorInfo.displayText} (${anchorInfo.roleText})` : 'None'}\n`;
            debugInfo += `  Expected S3 path: ${api.generateExpectedS3Path(space._id, space.host, space.createdAt)}\n`;
            debugInfo += `  MP3 URL found: ${mp3Url ? 'YES' : 'NO'}\n`;
            debugInfo += `  X.com URL: ${spaceUrl || 'Could not construct'}\n`;
        });
        
        modal.showDebugInfo(debugInfo);
    }

    /**
     * Refreshes all dashboard data with rate limiting
     */
    async refreshAll() {
        const now = Date.now();
        
        // Rate limiting: prevent refreshes more frequently than minRefreshInterval
        if (now - this.lastRefreshTime < this.minRefreshInterval) {
            const remainingTime = Math.ceil((this.minRefreshInterval - (now - this.lastRefreshTime)) / 1000);
            Utils.showMessage(`Please wait ${remainingTime} seconds before refreshing again`, CONFIG.MESSAGE_TYPES.ERROR);
            return;
        }
        
        this.lastRefreshTime = now;
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

// Create global instance - This is CRITICAL for app.js to work
const dashboard = new Dashboard();

// Make dashboard globally available for debugging and access from other scripts
window.dashboard = dashboard;

// Log that dashboard has been created
console.log('Dashboard instance created and made globally available');