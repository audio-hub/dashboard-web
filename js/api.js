/**
 * Simple multi-source audio mapper - just lists all audio files per space
 */

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.s3BaseUrl = CONFIG.S3_BASE_URL;
        this.audioFilesMap = {}; // Now stores arrays of audio files per spaceId
    }

    async makeRequest(endpoint) {
        try {
            const response = await fetch(this.baseUrl + endpoint);
            
            if (!response.ok) {
                let errorDetails = response.statusText;
                try {
                    const errorJson = await response.json();
                    if (errorJson.message) {
                        errorDetails = errorJson.message;
                    }
                } catch (e) {
                    // Ignore JSON parsing error, use statusText
                }
                throw new Error(`HTTP ${response.status}: ${errorDetails}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async getHealth() {
        return await this.makeRequest('health/status');
    }

    async getStats() {
        return await this.makeRequest('stats');
    }

    async getSpaces(filters = {}) {
        let endpoint = 'spaces?';
        const params = [];
        
        if (filters.limit) params.push(`limit=${filters.limit}`);
        if (filters.offset) params.push(`offset=${filters.offset}`); // Add offset support
        if (filters.status) params.push(`status=${filters.status}`);
        
        endpoint += params.join('&');
        return await this.makeRequest(endpoint);
    }

    async getSpaceDetails(spaceId) {
        return await this.makeRequest(`spaces/${spaceId}`);
    }

    async getSpaceParticipants(spaceId) {
        return await this.makeRequest(`spaces/${spaceId}/participants`);
    }

    async getFiles() {
        return await this.makeRequest('files');
    }

    /**
     * Extracts spaceId from filename
     */
    extractSpaceIdFromFilename(filename) {
        // Remove common audio extensions
        let cleanFilename = filename.replace(/\.(mp3|aac|m4a|mp4)$/i, '');
        return cleanFilename.split('-')[0];
    }

    /**
     * Loads audio files and groups them by spaceId
     */
    async loadAudioFiles() {
        try {
            console.log('🔄 Loading audio files...');
            const data = await this.getFiles();
            this.audioFilesMap = {};

            if (data.files && Array.isArray(data.files)) {
                console.log('📁 Processing files:', data.files.length);
                
                data.files.forEach(file => {
                    const filePath = file.name;
                    const parts = filePath.split('/');
                    
                    if (parts.length >= 3) {
                        const hostUsername = parts[0];
                        const date = parts[1];
                        const filename = parts[2];
                        
                        // Skip non-audio files
                        if (!/\.(mp3|aac|m4a|mp4)$/i.test(filename)) {
                            return;
                        }
                        
                        const spaceId = this.extractSpaceIdFromFilename(filename);
                        const audioInfo = {
                            url: this.s3BaseUrl + filePath,
                            filename: filename,
                            path: filePath
                        };
                        
                        // Create array if it doesn't exist
                        if (!this.audioFilesMap[spaceId]) {
                            this.audioFilesMap[spaceId] = [];
                        }
                        
                        // Add to array (no duplicates)
                        const exists = this.audioFilesMap[spaceId].some(existing => 
                            existing.url === audioInfo.url
                        );
                        
                        if (!exists) {
                            this.audioFilesMap[spaceId].push(audioInfo);
                        }
                        
                        // Also add with composite key for fallback
                        const compositeKey = `${hostUsername}/${date}/${spaceId}`;
                        if (!this.audioFilesMap[compositeKey]) {
                            this.audioFilesMap[compositeKey] = [];
                        }
                        
                        const compositeExists = this.audioFilesMap[compositeKey].some(existing => 
                            existing.url === audioInfo.url
                        );
                        
                        if (!compositeExists) {
                            this.audioFilesMap[compositeKey].push(audioInfo);
                        }
                    }
                });
                
                const spacesWithAudio = Object.keys(this.audioFilesMap).filter(key => !key.includes('/')).length;
                const totalAudioFiles = Object.values(this.audioFilesMap).reduce((sum, files) => sum + files.length, 0);
                
                console.log(`✅ Loaded ${totalAudioFiles} audio files for ${spacesWithAudio} spaces`);
                Utils.showMessage(`Loaded ${totalAudioFiles} audio files for ${spacesWithAudio} spaces`, CONFIG.MESSAGE_TYPES.SUCCESS);
            }
        } catch (error) {
            Utils.showMessage(`Failed to load audio files: ${error.message}`);
            console.error('Audio files error:', error);
            throw error;
        }
    }

    /**
     * Gets all audio files for a space
     */
    getAllAudioFilesBySpaceId(spaceId, hostUsername = null, createdAt = null) {
        // Try direct lookup first
        let audioFiles = this.audioFilesMap[spaceId];
        if (audioFiles && audioFiles.length > 0) {
            return [...audioFiles];
        }
        
        // Try composite key fallback
        if (hostUsername && createdAt) {
            const cleanHost = hostUsername.replace(/[@=]/g, '').toLowerCase();
            const date = new Date(createdAt).toISOString().split('T')[0];
            const compositeKey = `${cleanHost}/${date}/${spaceId}`;
            
            audioFiles = this.audioFilesMap[compositeKey];
            if (audioFiles && audioFiles.length > 0) {
                return [...audioFiles];
            }
        }
        
        return null;
    }

    /**
     * Gets first audio file for backward compatibility
     */
    getAudioUrlBySpaceId(spaceId, hostUsername = null, createdAt = null) {
        const audioFiles = this.getAllAudioFilesBySpaceId(spaceId, hostUsername, createdAt);
        return audioFiles && audioFiles.length > 0 ? audioFiles[0] : null;
    }

    getAudioFilesMap() {
        return this.audioFilesMap;
    }
}

const api = new ApiService();
window.api = api;