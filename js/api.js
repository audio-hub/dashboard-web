/**
 * Format-agnostic API service for backward compatibility with both MP3 and AAC files
 * Updated to handle any audio format (.mp3, .aac, .m4a, etc.)
 */

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.s3BaseUrl = CONFIG.S3_BASE_URL;
        this.audioFilesMap = {}; // Renamed from mp3FilesMap
        this.supportedFormats = ['.mp3', '.aac', '.m4a', '.mp4']; // Add more as needed
    }

    /**
     * Makes an asynchronous request to the API endpoint.
     */
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
     * Detects the file format from filename
     * @param {string} filename - The filename to check
     * @returns {string|null} File extension or null if not supported
     */
    detectAudioFormat(filename) {
        const lowerFilename = filename.toLowerCase();
        return this.supportedFormats.find(format => lowerFilename.endsWith(format)) || null;
    }

    /**
     * Extracts spaceId from filename, regardless of format
     * @param {string} filename - The filename (e.g., "1yNGaLVymagKj.mp3" or "1yNGaLVymagKj-host-title.aac")
     * @returns {string} Extracted spaceId
     */
    extractSpaceIdFromFilename(filename) {
        // Remove any supported audio extension
        let cleanFilename = filename;
        for (const format of this.supportedFormats) {
            if (cleanFilename.toLowerCase().endsWith(format)) {
                cleanFilename = cleanFilename.slice(0, -format.length);
                break;
            }
        }
        
        // Extract spaceId (first part before any dash)
        return cleanFilename.split('-')[0];
    }

    /**
     * Loads and processes audio files for spaceId-based mapping (format-agnostic)
     */
    async loadAudioFiles() {
        try {
            console.log('🔄 Loading audio files for spaceId mapping (all formats)...');
            const data = await this.getFiles();
            this.audioFilesMap = {};

            if (data.files && Array.isArray(data.files)) {
                console.log('📁 Processing audio files:', data.files.length, 'files found');
                
                data.files.forEach(file => {
                    console.log('\n--- Processing file ---');
                    console.log('File path:', file.name);
                    
                    const filePath = file.name;
                    const parts = filePath.split('/');
                    console.log('Path parts:', parts);
                    
                    if (parts.length >= 3) {
                        const hostUsername = parts[0];
                        const date = parts[1]; // e.g., "2025-05-28"
                        const filename = parts[2]; // e.g., "1yNGaLVymagKj.mp3" or "1yNGaLVymagKj.aac"
                        
                        // Check if it's a supported audio format
                        const audioFormat = this.detectAudioFormat(filename);
                        if (!audioFormat) {
                            console.log('❌ Skipping non-audio file');
                            return;
                        }
                        
                        console.log('Host username:', hostUsername);
                        console.log('Date:', date);
                        console.log('Filename:', filename);
                        console.log('Audio format:', audioFormat);
                        
                        // Extract spaceId from filename (format-agnostic)
                        const spaceId = this.extractSpaceIdFromFilename(filename);
                        console.log('Extracted spaceId:', spaceId);
                        
                        // Store using the spaceId as the key
                        this.audioFilesMap[spaceId] = {
                            url: this.s3BaseUrl + filePath,
                            format: audioFormat,
                            originalPath: filePath
                        };
                        console.log(`Stored mapping: "${spaceId}" -> ${this.s3BaseUrl + filePath} (${audioFormat})`);
                        
                        // Also store with hostName+date+spaceId pattern for fallback
                        const compositeKey = `${hostUsername}/${date}/${spaceId}`;
                        this.audioFilesMap[compositeKey] = {
                            url: this.s3BaseUrl + filePath,
                            format: audioFormat,
                            originalPath: filePath
                        };
                        console.log(`Stored composite mapping: "${compositeKey}" -> URL (${audioFormat})`);
                        
                    } else {
                        console.log('❌ Skipping file - not enough path parts or wrong structure');
                        console.log('Expected: hostName/date/spaceId.[audio_format]');
                    }
                });
                
                console.log('\n✅ Final audio mapping keys:');
                Object.keys(this.audioFilesMap).forEach(key => {
                    const audioInfo = this.audioFilesMap[key];
                    console.log(`  "${key}" -> ${audioInfo.format}`);
                });
                
                const totalFiles = Object.keys(this.audioFilesMap).length;
                Utils.showMessage(`Loaded ${totalFiles} audio file mappings`, CONFIG.MESSAGE_TYPES.SUCCESS);
            }
        } catch (error) {
            Utils.showMessage(`Failed to load audio file list: ${error.message}`);
            console.error('Audio files error:', error);
            throw error;
        }
    }

    /**
     * Gets audio URL for a space using spaceId-based mapping (format-agnostic)
     * @param {string} spaceId - The space ID
     * @param {string} hostUsername - Host username (for fallback path construction)
     * @param {string} createdAt - Creation date (for fallback path construction)
     * @returns {Object|null} Audio info object with url and format, or null if not found
     */
    getAudioUrlBySpaceId(spaceId, hostUsername = null, createdAt = null) {
        console.log('\n🔍 Looking up audio for spaceId:', spaceId);
        
        // Method 1: Direct spaceId lookup
        console.log('Method 1: Direct spaceId lookup');
        let audioInfo = this.audioFilesMap[spaceId];
        if (audioInfo) {
            console.log('✅ Found via direct spaceId lookup:', audioInfo.url, `(${audioInfo.format})`);
            return audioInfo;
        }
        console.log('❌ No direct match for spaceId');
        
        // Method 2: Try composite key if we have host and date info
        if (hostUsername && createdAt) {
            console.log('Method 2: Composite key lookup');
            
            // Clean up hostname
            const cleanHost = hostUsername.replace(/[@=]/g, '').toLowerCase();
            
            // Extract date part from createdAt
            const date = new Date(createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
            
            const compositeKey = `${cleanHost}/${date}/${spaceId}`;
            console.log('Trying composite key:', compositeKey);
            
            audioInfo = this.audioFilesMap[compositeKey];
            if (audioInfo) {
                console.log('✅ Found via composite key:', audioInfo.url, `(${audioInfo.format})`);
                return audioInfo;
            }
            console.log('❌ No match for composite key');
        }
        
        // Method 3: Fallback - try to construct expected URLs for all supported formats
        if (hostUsername && createdAt) {
            console.log('Method 3: Try all supported formats');
            
            for (const format of this.supportedFormats) {
                const expectedPath = this.generateExpectedS3Path(spaceId, hostUsername, createdAt, format);
                const expectedUrl = this.s3BaseUrl + expectedPath;
                
                console.log(`Trying format ${format}: ${expectedPath}`);
                
                // Check if this path exists in our mapping
                const foundKey = Object.keys(this.audioFilesMap).find(key => 
                    this.audioFilesMap[key].url === expectedUrl
                );
                
                if (foundKey) {
                    console.log('✅ Found via expected URL construction:', expectedUrl, `(${format})`);
                    return this.audioFilesMap[foundKey];
                }
            }
            console.log('❌ No expected URLs found for any format');
        }
        
        console.log('❌ No audio found for space:', spaceId);
        console.log('Available spaceId keys in map:');
        Object.keys(this.audioFilesMap)
            .filter(key => !key.includes('/')) // Only show direct spaceId keys
            .slice(0, 5)
            .forEach(key => {
                const audioInfo = this.audioFilesMap[key];
                console.log(`  "${key}" (${audioInfo.format})`);
            });
        
        return null;
    }

    /**
     * Generates expected S3 path for a space with specified format
     * @param {string} spaceId - Space ID
     * @param {string} hostUsername - Host username
     * @param {string} createdAt - Creation date
     * @param {string} format - Audio format (e.g., '.mp3', '.aac')
     * @returns {string} Expected S3 path
     */
    generateExpectedS3Path(spaceId, hostUsername, createdAt, format = '.aac') {
        if (!spaceId) return '';
        
        // Default fallback if no host/date info
        if (!hostUsername || !createdAt) {
            return `spaces/${spaceId}${format}`;
        }
        
        // Clean up hostname (same logic as s3-uploader.js)
        const cleanHost = hostUsername
            .replace(/[@]/g, '')
            .replace(/[^a-zA-Z0-9\-_.\/]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50) || 'unknown';
        
        // Extract date
        const date = new Date(createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
        
        return `${cleanHost}/${date}/${spaceId}${format}`;
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use getAudioUrlBySpaceId instead
     */
    getMp3UrlBySpaceId(spaceId, hostUsername = null, createdAt = null) {
        console.warn('getMp3UrlBySpaceId is deprecated, use getAudioUrlBySpaceId instead');
        const audioInfo = this.getAudioUrlBySpaceId(spaceId, hostUsername, createdAt);
        return audioInfo ? audioInfo.url : null;
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use loadAudioFiles instead
     */
    async loadMp3Files() {
        console.warn('loadMp3Files is deprecated, use loadAudioFiles instead');
        return await this.loadAudioFiles();
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use getAudioFilesMap instead
     */
    getMp3FilesMap() {
        console.warn('getMp3FilesMap is deprecated, use getAudioFilesMap instead');
        // Convert new format back to old format for compatibility
        const legacyMap = {};
        Object.keys(this.audioFilesMap).forEach(key => {
            legacyMap[key] = this.audioFilesMap[key].url;
        });
        return legacyMap;
    }

    /**
     * Gets the audio files map with format information
     * @returns {Object} Audio files map with format info
     */
    getAudioFilesMap() {
        return this.audioFilesMap;
    }

    /**
     * Gets supported audio formats
     * @returns {Array<string>} Array of supported file extensions
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }
}

const api = new ApiService();
window.api = api;