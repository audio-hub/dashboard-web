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
/**
     * Displays the fetched statistics in the dashboard.
     * @param {Object} stats - The statistics data.
     */
    displayStats(stats) {
        if (!this.statsGrid) return;

        // Core metrics
        const totalSpaces = stats.overview.totalSpaces || 0;
        const liveSpaces = stats.overview.liveSpaces || 0;
        const recordingSuccessRate = stats.overview.recordingSuccessRate || 0;
        const avgParticipants = stats.overview.avgParticipants || 0;
        
        // Privacy metrics
        const publicPercentage = stats.privacy.publicPercentage || 0;
        const privateSpaces = stats.privacy.privateSpaces || 0;
        
        // Discovery metrics
        const discoverySuccessRate = stats.discovery.discoverySuccessRate || 0;
        const spacesWithAnchor = stats.discovery.spacesWithAnchor || 0;
        
        // Activity metrics
        const recentSpaces = stats.activity.recentSpaces || 0;
        const hostDiversity = stats.activity.hostDiversity || 0;

        this.statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${totalSpaces}</div>
                <div class="stat-label">Total Spaces</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${liveSpaces}</div>
                <div class="stat-label">Currently Live</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${recordingSuccessRate}%</div>
                <div class="stat-label">Recording Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${publicPercentage}%</div>
                <div class="stat-label">Public Spaces</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${discoverySuccessRate}%</div>
                <div class="stat-label">Discovery Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgParticipants}</div>
                <div class="stat-label">Avg Participants</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${recentSpaces}</div>
                <div class="stat-label">Recent (24h)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${hostDiversity}</div>
                <div class="stat-label">Unique Hosts (24h)</div>
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
     * Enhanced space display with format-agnostic audio mapping
     * @param {Array<Object>} spaces - An array of Twitter Space objects.
     */
displaySpaces(spaces) {
    if (!this.spacesContent) return;

    if (!spaces || spaces.length === 0) {
        this.spacesContent.innerHTML = '<div class="loading">No spaces found</div>';
        return;
    }

    // Simple stats
    const liveCount = spaces.filter(s => s.isLive).length;
    const endedCount = spaces.length - liveCount;
    const withAnchorCount = spaces.filter(s => s.anchor).length;
    
    // Count spaces with audio
    let spacesWithAudio = 0;
    let totalAudioFiles = 0;
    let spacesWithMultipleAudio = 0;
    
    spaces.forEach(space => {
        const audioFiles = api.getAllAudioFilesBySpaceId(space._id, space.host, space.createdAt);
        if (audioFiles && audioFiles.length > 0) {
            spacesWithAudio++;
            totalAudioFiles += audioFiles.length;
            if (audioFiles.length > 1) {
                spacesWithMultipleAudio++;
            }
        }
    });
    
    let sortingInfo = `<div class="sorting-info">Showing ${spaces.length} spaces`;
    if (liveCount > 0) sortingInfo += ` (${liveCount} live)`;
    if (withAnchorCount > 0) sortingInfo += ` • ${withAnchorCount} discovered via following`;
    if (spacesWithAudio > 0) {
        sortingInfo += ` • ${spacesWithAudio} with audio (${totalAudioFiles} files total)`;
        if (spacesWithMultipleAudio > 0) {
            sortingInfo += `, ${spacesWithMultipleAudio} with multiple files`;
        }
    }
    sortingInfo += '</div>';

    this.spacesContent.innerHTML = sortingInfo + spaces.map(space => {
        const audioFiles = api.getAllAudioFilesBySpaceId(space._id, space.host, space.createdAt);
        const spaceUrl = this.getSpaceUrl(space);
        const privacyInfo = this.getPrivacyInfo(space);
        const anchorInfo = this.getAnchorInfo(space);
        
        return this.createSpaceItemHTML(space, audioFiles, spaceUrl, privacyInfo, anchorInfo);
    }).join('');
}

    /**
     * Gets audio format statistics for the displayed spaces
     * @param {Array<Object>} spaces - Array of spaces
     * @returns {Object} Audio format statistics
     */
    getAudioFormatStats(spaces) {
        const formatCounts = {};
        let totalWithAudio = 0;

        spaces.forEach(space => {
            const audioInfo = api.getAudioUrlBySpaceId(space._id, space.host, space.createdAt);
            if (audioInfo) {
                totalWithAudio++;
                const format = audioInfo.format.replace('.', '').toUpperCase();
                formatCounts[format] = (formatCounts[format] || 0) + 1;
            }
        });

        const formatBreakdown = Object.entries(formatCounts)
            .map(([format, count]) => `${count} ${format}`)
            .join(', ');

        return {
            totalWithAudio,
            formatCounts,
            formatBreakdown
        };
    }

    /**
     * Creates HTML for a single space item with format-agnostic audio support
     * @param {Object} space - Space object
     * @param {Object|null} audioInfo - Audio info object with url and format
     * @param {string|null} spaceUrl - X.com URL for the space
     * @param {Object} privacyInfo - Privacy information object
     * @param {Object} anchorInfo - Anchor information object
     * @returns {string} HTML string
     */
createSpaceItemHTML(space, audioFiles, spaceUrl, privacyInfo, anchorInfo) {
    const relevantDate = this.getRelevantDate(space);
    const timeDisplay = this.formatTimeDisplay(space, relevantDate);
    
    // Handle multiple audio sources
    let audioBadge = '';
    let audioSection = '';
    
    if (audioFiles && audioFiles.length > 0) {
        if (audioFiles.length === 1) {
            audioBadge = `<span class="space-badge badge-participants">🎧 Audio Available</span>`;
            audioSection = `<button class="btn-small" onclick="window.open('${audioFiles[0].url}', '_blank')">🎧 Listen</button>`;
        } else {
            audioBadge = `<span class="space-badge badge-participants">🎧 ${audioFiles.length} Audio Files</span>`;
            
            // Create organized list for multiple files
            const audioList = audioFiles.map((file, index) => {
                const fileName = file.filename || `Audio ${index + 1}`;
                return `
                    <li class="audio-item">
                        <span class="audio-filename">${fileName}</span>
                        <button class="btn-small btn-audio" onclick="window.open('${file.url}', '_blank')">🎧 Listen</button>
                    </li>
                `;
            }).join('');
            
            audioSection = `
                <div class="audio-list-container">
                    <div class="audio-list-header">Audio Files:</div>
                    <ul class="audio-list">
                        ${audioList}
                    </ul>
                </div>
            `;
        }
    }
    
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
                ${audioBadge}
            </div>
            ${privacyInfo.isPrivate === null ? `<div class="debug-info">Privacy status: Inferred from available data (space predates privacy tracking)</div>` : ''}

            <div class="space-actions">
                ${spaceUrl ? `<button class="btn-small btn-primary" onclick="window.open('${spaceUrl}', '_blank')">🔗 Open on X</button>` : ''}
                <button class="btn-small" onclick="dashboard.viewSpaceDetails('${space._id}')">View Details</button>
                <button class="btn-small" onclick="dashboard.viewParticipants('${space._id}')">View Participants</button>
                ${audioFiles && audioFiles.length === 1 ? audioSection : ''}
            </div>
            ${audioFiles && audioFiles.length > 1 ? audioSection : ''}
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
     * Debug function to show format-agnostic audio mapping
     */
    debugMapping() {
        if (this.allSpaces.length === 0) {
            Utils.showMessage('Load spaces first to debug mapping');
            return;
        }
        
        let debugInfo = 'FORMAT-AGNOSTIC AUDIO MAPPING, PRIVACY & ANCHOR DEBUG:\n\n';
        const audioMap = api.getAudioFilesMap();
        const supportedFormats = api.getSupportedFormats();
        
        debugInfo += `Supported audio formats: ${supportedFormats.join(', ')}\n`;
        debugInfo += `Available audio files (${Object.keys(audioMap).length}):\n`;
        
        // Group by format for better overview
        const formatGroups = {};
        Object.keys(audioMap).forEach(key => {
            const audioInfo = audioMap[key];
            const format = audioInfo.format;
            if (!formatGroups[format]) formatGroups[format] = [];
            formatGroups[format].push(key);
        });
        
        Object.entries(formatGroups).forEach(([format, keys]) => {
            debugInfo += `\n${format.toUpperCase()} files (${keys.length}):\n`;
            keys.slice(0, 5).forEach(key => {
                debugInfo += `  ${key}\n`;
            });
            if (keys.length > 5) {
                debugInfo += `  ... and ${keys.length - 5} more\n`;
            }
        });
        
        // Privacy and anchor statistics (same as before)
        const privateSpaces = this.allSpaces.filter(s => s.private === true);
        const publicSpaces = this.allSpaces.filter(s => s.private === false);
        const unknownSpaces = this.allSpaces.filter(s => typeof s.private !== 'boolean');
        
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
        
        debugInfo += '\nSpaces and their format-agnostic mapping:\n';
        this.allSpaces.forEach(space => {
            const audioInfo = api.getAudioUrlBySpaceId(space._id, space.host, space.createdAt);
            const spaceUrl = this.getSpaceUrl(space);
            const privacyInfo = this.getPrivacyInfo(space);
            const anchorInfo = this.getAnchorInfo(space);
            
            debugInfo += `\nSpace: "${space.title || 'Untitled'}" by @${space.host || 'unknown'}\n`;
            debugInfo += `  Space ID: ${space._id}\n`;
            debugInfo += `  Privacy: ${privacyInfo.status} (${privacyInfo.tooltip})\n`;
            debugInfo += `  Anchor: ${anchorInfo.hasAnchor ? `${anchorInfo.displayText} (${anchorInfo.roleText})` : 'None'}\n`;
            
            // Show all possible paths for all formats
            supportedFormats.forEach(format => {
                const expectedPath = api.generateExpectedS3Path(space._id, space.host, space.createdAt, format);
                debugInfo += `  Expected ${format} path: ${expectedPath}\n`;
            });
            
            debugInfo += `  Audio found: ${audioInfo ? `YES (${audioInfo.format})` : 'NO'}\n`;
            debugInfo += `  Audio URL: ${audioInfo ? audioInfo.url : 'Not available'}\n`;
            debugInfo += `  X.com URL: ${spaceUrl || 'Could not construct'}\n`;
        });
        
        modal.showDebugInfo(debugInfo);
    }

    /**
     * Updated refresh method to use new audio loading
     */
    async refreshAll() {
        const now = Date.now();
        
        if (now - this.lastRefreshTime < this.minRefreshInterval) {
            const remainingTime = Math.ceil((this.minRefreshInterval - (now - this.lastRefreshTime)) / 1000);
            Utils.showMessage(`Please wait ${remainingTime} seconds before refreshing again`, CONFIG.MESSAGE_TYPES.ERROR);
            return;
        }
        
        this.lastRefreshTime = now;
        Utils.showMessage('Refreshing all data...', CONFIG.MESSAGE_TYPES.SUCCESS);
        
        try {
            await api.loadAudioFiles(); // Updated method name
            await this.loadHealth();
            await this.loadStats();
            await this.loadSpaces();
        } catch (error) {
            Utils.showMessage(`Failed to refresh data: ${error.message}`);
        }
    }

    /**
     * Loads health status from the API and displays it.
     */
    async loadHealth() {
        const healthPanel = Utils.getElementById('health-panel');
        const healthInstances = Utils.getElementById('health-instances');
        const fleetStatus = Utils.getElementById('fleet-status');
        const healthSummary = Utils.getElementById('health-summary');

        if (!healthPanel || !healthInstances || !fleetStatus) return;

        healthInstances.innerHTML = '<div class="loading">Loading health status...</div>';

        try {
            const data = await api.getHealth();
            this.displayHealth(data);
            healthPanel.style.display = 'block';
        } catch (error) {
            healthInstances.innerHTML = `<div class="error">Failed to load health status: ${error.message}</div>`;
            console.error('Health error:', error);
        }
    }

    /**
     * Displays the health status data.
     * @param {Object} healthData - The health data from API.
     */
    displayHealth(healthData) {
        const healthInstances = Utils.getElementById('health-instances');
        const fleetStatus = Utils.getElementById('fleet-status');
        const healthSummary = Utils.getElementById('health-summary');

        if (!healthInstances || !fleetStatus || !healthSummary) return;

        // Filter to max 2 instances, keeping the most recent ones
        let instances = healthData.instances || [];
        if (instances.length > 2) {
            instances = instances
                .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
                .slice(0, 2);
        }

        // Update fleet status
        const statusClass = healthData.fleet_status === 'healthy' ? 'healthy' : 'unhealthy';
        fleetStatus.className = `health-status ${statusClass}`;
        fleetStatus.textContent = `${healthData.fleet_status.toUpperCase()} (${healthData.healthy_instances}/${healthData.active_instances})`;

        // Display instances
        if (instances.length === 0) {
            healthInstances.innerHTML = '<div class="loading">No instances found</div>';
            return;
        }

        healthInstances.innerHTML = instances.map(instance => {
            const statusClass = instance.status === 'healthy' ? 'healthy' : 'unhealthy';
            const uptime = this.formatUptime(instance.metrics?.uptime || 0);
            const lastSeen = this.formatTimeSince(instance.lastSeen);

            return `
                <div class="health-instance ${statusClass}">
                    <div class="instance-id">Instance: ${instance.id}</div>
                    <div class="instance-metrics">
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value">${instance.status}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Uptime:</span>
                            <span class="metric-value">${uptime}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">MongoDB:</span>
                            <span class="metric-value">${instance.metrics?.mongodb_connected ? '✅' : '❌'}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Spaces Indexed:</span>
                            <span class="metric-value">${instance.metrics?.spaces_indexed || 0}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Memory:</span>
                            <span class="metric-value">${instance.metrics?.memory_usage || 0}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Last Seen:</span>
                            <span class="metric-value">${lastSeen}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Update summary
        const totalSpacesIndexed = instances.reduce((sum, instance) => 
            sum + (instance.metrics?.spaces_indexed || 0), 0);
        
        healthSummary.textContent = `Total spaces indexed: ${totalSpacesIndexed} • Last updated: ${new Date(healthData.timestamp).toLocaleTimeString()}`;
    }

    /**
     * Formats uptime seconds into readable format.
     * @param {number} seconds - Uptime in seconds.
     * @returns {string} Formatted uptime string.
     */
    formatUptime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
        return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    }

    /**
     * Formats time since last seen.
     * @param {string} lastSeenTime - ISO timestamp.
     * @returns {string} Formatted time string.
     */
    formatTimeSince(lastSeenTime) {
        const diff = Date.now() - new Date(lastSeenTime).getTime();
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    }

}

// Create global instance - This is CRITICAL for app.js to work
const dashboard = new Dashboard();

// Make dashboard globally available for debugging and access from other scripts
window.dashboard = dashboard;

// Log that dashboard has been created
console.log('Dashboard instance created and made globally available');