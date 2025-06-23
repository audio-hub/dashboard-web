/**
 * Enhanced Dashboard management with spaceId-based MP3 mapping and anchor information
 * Updated to handle host as string, reduce auto-updates, and display anchor data
 * ADDED: Download functionality alongside listen buttons
 */

class Dashboard {
    constructor() {
        this.allSpaces = [];
        this.statsSection = null;
        this.statsGrid = null;
        this.spacesContent = null;
        // Removed auto-refresh related properties
        
        // Infinite scroll state
        this.currentOffset = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.pageSize = 20;
        
        this.init();
    }

    /**
     * Initialize dashboard elements
     */
    init() {
        this.statsSection = Utils.getElementById('stats-section');
        this.statsGrid = Utils.getElementById('statsGrid');
        this.spacesContent = Utils.getElementById('spacesContent');
        // Removed statusFilter since it's no longer needed
        
        // Set up infinite scroll
        this.setupInfiniteScroll();
    }

    /**
     * Sets up infinite scroll functionality
     */
    setupInfiniteScroll() {
        window.addEventListener('scroll', Utils.debounce(() => {
            if (this.isLoading || !this.hasMore) return;
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // Load more when user is 300px from bottom
            if (scrollTop + windowHeight >= documentHeight - 300) {
                this.loadMoreSpaces();
            }
        }, 100));
    }

    /**
     * Downloads an audio file with proper filename using fetch to force download
     * @param {string} url - Audio file URL
     * @param {string} filename - Suggested filename
     * @param {Object} space - Space object for additional context
     */
    async downloadAudioFile(url, filename, space) {
        try {
            // Create a more descriptive filename
            const hostSlug = Utils.slugify(space.host || 'unknown');
            const titleSlug = Utils.slugify(space.title || 'untitled');
            const dateStr = space.createdAt ? 
                new Date(space.createdAt).toISOString().split('T')[0] : 
                'unknown-date';
            
            // Extract file extension from original filename or URL
            const extension = filename.match(/\.(mp3|aac|m4a|mp4)$/i)?.[1] || 'mp3';
            
            // Create descriptive filename: host_title_date_spaceId.extension
            const downloadFilename = `${hostSlug}_${titleSlug}_${dateStr}_${space._id}.${extension}`;
            
            Utils.showMessage(`Starting download: ${downloadFilename}`, CONFIG.MESSAGE_TYPES.SUCCESS);
            
            // Fetch the file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Get the blob
            const blob = await response.blob();
            
            // Create download link with blob URL
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = downloadFilename;
            link.style.display = 'none';
            
            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up blob URL
            window.URL.revokeObjectURL(blobUrl);
            
            Utils.showMessage(`Download started: ${downloadFilename}`, CONFIG.MESSAGE_TYPES.SUCCESS);
        } catch (error) {
            console.error('Download failed:', error);
            Utils.showMessage(`Download failed: ${error.message}`);
            
            // Fallback: try simple download attribute approach
            try {
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || 'audio_file';
                link.target = '_blank';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                Utils.showMessage('Fallback download attempt initiated', CONFIG.MESSAGE_TYPES.SUCCESS);
            } catch (fallbackError) {
                console.error('Fallback download also failed:', fallbackError);
                Utils.showMessage('Download failed. You can right-click the Listen button and "Save link as..."');
            }
        }
    }

    /**
     * Loads statistics from the API and displays them.
     */
    async loadStats() {
        try {
            const data = await api.getStats();
            this.displayStats(data.data);
            // if (this.statsSection) {
            //     this.statsSection.style.display = 'block';
            // }
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
     * Updated for infinite scroll - always starts fresh
     */
    async loadSpaces() {
        if (!this.spacesContent) return;

        // Reset pagination state
        this.currentOffset = 0;
        this.hasMore = true;
        this.allSpaces = [];

        this.spacesContent.innerHTML = '<div class="loading">Loading spaces...</div>';

        try {
            const filters = this.getFilterValues();
            filters.offset = 0;
            filters.limit = this.pageSize;
            
            const data = await api.getSpaces(filters);
            
            this.allSpaces = data.data;
            this.currentOffset = this.pageSize;
            this.hasMore = data.hasMore;
            
            // Sort spaces before displaying
            const sortedSpaces = this.sortSpaces(data.data);
            this.displaySpaces(sortedSpaces, false); // false = replace content
        } catch (error) {
            this.spacesContent.innerHTML = `<div class="error">Failed to load spaces: ${error.message}</div>`;
            console.error('Spaces error:', error);
        }
    }

    /**
     * Loads more spaces for infinite scroll
     */
    async loadMoreSpaces() {
        if (this.isLoading || !this.hasMore) return;
        
        this.isLoading = true;
        
        try {
            const filters = this.getFilterValues();
            filters.offset = this.currentOffset;
            filters.limit = this.pageSize;
            
            const data = await api.getSpaces(filters);
            
            if (data.data && data.data.length > 0) {
                this.allSpaces = [...this.allSpaces, ...data.data];
                this.currentOffset += data.data.length;
                this.hasMore = data.hasMore;
                
                // Sort new spaces and append
                const sortedSpaces = this.sortSpaces(data.data);
                this.displaySpaces(sortedSpaces, true); // true = append content
            } else {
                this.hasMore = false;
            }
        } catch (error) {
            console.error('Error loading more spaces:', error);
            Utils.showMessage(`Failed to load more spaces: ${error.message}`);
        } finally {
            this.isLoading = false;
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
            // No status filter anymore - just return defaults
            limit: this.pageSize
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
     * Updated for infinite scroll support
     * @param {Array<Object>} spaces - An array of Twitter Space objects.
     * @param {boolean} append - Whether to append (true) or replace (false) content
     */
displaySpaces(spaces, append = false) {
    if (!this.spacesContent) return;

    if (!spaces || spaces.length === 0) {
        if (!append) {
            this.spacesContent.innerHTML = '<div class="loading">No spaces found</div>';
        }
        return;
    }

    // Build the spaces HTML
    const spacesHTML = spaces.map(space => {
        const audioFiles = api.getAllAudioFilesBySpaceId(space._id, space.host, space.createdAt);
        const spaceUrl = this.getSpaceUrl(space);
        const privacyInfo = this.getPrivacyInfo(space);
        const anchorInfo = this.getAnchorInfo(space);
        
        return this.createSpaceItemHTML(space, audioFiles, spaceUrl, privacyInfo, anchorInfo);
    }).join('');

    if (append) {
        // Append mode: add new spaces to existing content
        const existingContent = this.spacesContent.innerHTML;
        // Remove any existing loading indicator first
        const cleanContent = existingContent.replace(/<div class="loading"[^>]*>.*?<\/div>/g, '');
        this.spacesContent.innerHTML = cleanContent + spacesHTML;
        
        // Add loading indicator if there are more spaces
        if (this.hasMore) {
            this.spacesContent.innerHTML += '<div class="loading" style="padding: 20px; text-align: center; color: #666;">Scroll down for more...</div>';
        }
    } else {
        // Replace mode: show stats + new spaces
        const allSpacesForStats = this.allSpaces; // Use all loaded spaces for stats
        
        // Simple stats
        const liveCount = allSpacesForStats.filter(s => s.isLive).length;
        const withAnchorCount = allSpacesForStats.filter(s => s.anchor).length;
        
        // Count spaces with audio
        let spacesWithAudio = 0;
        let totalAudioFiles = 0;
        let spacesWithMultipleAudio = 0;
        
        allSpacesForStats.forEach(space => {
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
        if (this.hasMore) sortingInfo += ` (scroll for more)`;
        if (liveCount > 0) sortingInfo += ` • ${liveCount} live`;
        if (withAnchorCount > 0) sortingInfo += ` • ${withAnchorCount} discovered via following`;
        if (spacesWithAudio > 0) {
            sortingInfo += ` • ${spacesWithAudio} with audio (${totalAudioFiles} files total)`;
            if (spacesWithMultipleAudio > 0) {
                sortingInfo += `, ${spacesWithMultipleAudio} with multiple files`;
            }
        }
        sortingInfo += '</div>';

        this.spacesContent.innerHTML = sortingInfo + spacesHTML;
        
        // Add loading indicator if there are more spaces
        if (this.hasMore) {
            this.spacesContent.innerHTML += '<div class="loading" style="padding: 20px; text-align: center; color: #666;">Scroll down for more...</div>';
        }
    }
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
     * UPDATED: Added download buttons alongside listen buttons
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
            const file = audioFiles[0];
            const duration = file.size ? this.calculateAudioDuration(file.size) : null;
            const durationText = duration ? ` • ${duration}` : '';
            
            audioBadge = `<span class="space-badge badge-participants">🎧 Audio Available${durationText}</span>`;
            audioSection = `
                <button class="btn-small" onclick="window.open('${file.url}', '_blank')">🎧 Listen${durationText}</button>
                <button class="btn-small" onclick="dashboard.downloadAudioFile('${file.url}', '${file.filename}', ${JSON.stringify(space).replace(/"/g, '&quot;')})">📥 Download</button>
            `;
        } else {
            // Calculate total duration for multiple files
            let totalDuration = 0;
            let hasAllSizes = true;
            
            audioFiles.forEach(file => {
                if (file.size) {
                    const durationSeconds = (file.size * 8) / (128 * 1000); // 128kbps AAC
                    totalDuration += durationSeconds;
                } else {
                    hasAllSizes = false;
                }
            });
            
            const totalDurationText = hasAllSizes && totalDuration > 0 ? 
                ` • ${this.formatDurationFromSeconds(totalDuration)}` : '';
            
            audioBadge = `<span class="space-badge badge-participants">🎧 ${audioFiles.length} Audio Files${totalDurationText}</span>`;
            
            // Create organized list for multiple files
            const audioList = audioFiles.map((file, index) => {
                const fileName = file.filename || `Audio ${index + 1}`;
                const duration = file.size ? this.calculateAudioDuration(file.size) : null;
                const durationText = duration ? ` (${duration})` : '';
                
                return `
                    <li class="audio-item">
                        <span class="audio-filename">${fileName}${durationText}</span>
                        <div class="audio-buttons">
                            <button class="btn-small btn-audio" onclick="window.open('${file.url}', '_blank')">🎧 Listen</button>
                            <button class="btn-small btn-audio" onclick="dashboard.downloadAudioFile('${file.url}', '${file.filename}', ${JSON.stringify(space).replace(/"/g, '&quot;')})">📥 Download</button>
                        </div>
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
                ${audioFiles && audioFiles.length === 1 ? audioSection : ''}
            </div>
            ${audioFiles && audioFiles.length > 1 ? audioSection : ''}
        </div>
    `;
}
    /**
     * Calculates estimated audio duration from file size
     * @param {number} fileSizeBytes - File size in bytes
     * @param {number} bitrateKbps - Bitrate in kbps (default 128 for AAC)
     * @returns {string} Formatted duration string
     */
    calculateAudioDuration(fileSizeBytes, bitrateKbps = 128) {
        if (!fileSizeBytes || fileSizeBytes <= 0) return null;
        
        // Formula: Duration (seconds) = (File Size in bytes × 8) / (Bitrate in bits per second)
        const durationSeconds = (fileSizeBytes * 8) / (bitrateKbps * 1000);
        
        return this.formatDurationFromSeconds(durationSeconds);
    }

    /**
     * Formats duration from seconds to human readable format
     * @param {number} durationSeconds - Duration in seconds
     * @returns {string} Formatted duration string with ~ prefix
     */
    formatDurationFromSeconds(durationSeconds) {
        const minutes = Math.floor(durationSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours > 0) {
            return `~${hours}h ${remainingMinutes}m`;
        } else {
            return `~${minutes}m`;
        }
    }

    /**
     * Gets file size from the API files data
     * @param {string} filePath - The full file path
     * @returns {number|null} File size in bytes or null if not found
     */
    getFileSizeByPath(filePath) {
        // This would need to be populated from the files API
        // For now, we'll need to modify the audio loading to include size
        return null; // Placeholder - will be implemented when files API includes size
    }
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
     * Refresh method - removed auto-refresh throttling, simplified
     */
    async refreshAll() {
        Utils.showMessage('Refreshing all data...', CONFIG.MESSAGE_TYPES.SUCCESS);
        
        try {
            await api.loadAudioFiles();
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
            // healthPanel.style.display = 'block';
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