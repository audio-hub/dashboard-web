/**
 * API communication layer for the Twitter Spaces Dashboard with spaceId-based MP3 mapping
 * Updated to use new spaceId naming convention
 */

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.s3BaseUrl = CONFIG.S3_BASE_URL;
        this.mp3FilesMap = {};
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
     * Loads and processes MP3 files for spaceId-based mapping
     */
    async loadMp3Files() {
        try {
            console.log('🔄 Loading MP3 files for spaceId mapping...');
            const data = await this.getFiles();
            this.mp3FilesMap = {};

            if (data.files && Array.isArray(data.files)) {
                console.log('📁 Processing MP3 files:', data.files.length, 'files found');
                
                data.files.forEach(file => {
                    console.log('\n--- Processing file ---');
                    console.log('File path:', file.name);
                    
                    const filePath = file.name;
                    const parts = filePath.split('/');
                    console.log('Path parts:', parts);
                    
                    if (parts.length >= 3) {
                        const hostUsername = parts[0];
                        const date = parts[1]; // e.g., "2025-05-28"
                        const filename = parts[2]; // e.g., "1yNGaLVymagKj.mp3"
                        
                        // Skip files that don't end with .mp3
                        if (!filename.toLowerCase().endsWith('.mp3')) {
                            console.log('❌ Skipping non-MP3 file');
                            return;
                        }
                        
                        console.log('Host username:', hostUsername);
                        console.log('Date:', date);
                        console.log('Filename:', filename);
                        
                        // Extract spaceId from filename (remove .mp3 extension)
                        const spaceId = filename.replace(/\.mp3$/i, '');
                        console.log('Extracted spaceId:', spaceId);
                        
                        // Store using the spaceId as the key
                        this.mp3FilesMap[spaceId] = this.s3BaseUrl + filePath;
                        console.log(`Stored mapping: "${spaceId}" -> ${this.s3BaseUrl + filePath}`);
                        
                        // Also store with hostName+date+spaceId pattern for fallback
                        const compositeKey = `${hostUsername}/${date}/${spaceId}`;
                        this.mp3FilesMap[compositeKey] = this.s3BaseUrl + filePath;
                        console.log(`Stored composite mapping: "${compositeKey}" -> URL`);
                        
                    } else {
                        console.log('❌ Skipping file - not enough path parts or wrong structure');
                        console.log('Expected: hostName/date/spaceId.mp3');
                    }
                });
                
                console.log('\n✅ Final MP3 mapping keys:');
                Object.keys(this.mp3FilesMap).forEach(key => {
                    console.log(`  "${key}"`);
                });
                
                Utils.showMessage(`Loaded ${Object.keys(this.mp3FilesMap).length} MP3 file mappings`, CONFIG.MESSAGE_TYPES.SUCCESS);
            }
        } catch (error) {
            Utils.showMessage(`Failed to load MP3 file list: ${error.message}`);
            console.error('MP3 files error:', error);
            throw error;
        }
    }

    /**
     * Gets MP3 URL for a space using spaceId-based mapping
     * @param {string} spaceId - The space ID
     * @param {string} hostUsername - Host username (for fallback path construction)
     * @param {string} createdAt - Creation date (for fallback path construction)
     * @returns {string|null} MP3 URL if found
     */
    getMp3UrlBySpaceId(spaceId, hostUsername = null, createdAt = null) {
        console.log('\n🔍 Looking up MP3 for spaceId:', spaceId);
        
        // Method 1: Direct spaceId lookup
        console.log('Method 1: Direct spaceId lookup');
        let mp3Url = this.mp3FilesMap[spaceId];
        if (mp3Url) {
            console.log('✅ Found via direct spaceId lookup:', mp3Url);
            return mp3Url;
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
            
            mp3Url = this.mp3FilesMap[compositeKey];
            if (mp3Url) {
                console.log('✅ Found via composite key:', mp3Url);
                return mp3Url;
            }
            console.log('❌ No match for composite key');
        }
        
        // Method 3: Fallback - construct expected URL and check if key exists
        if (hostUsername && createdAt) {
            console.log('Method 3: Construct expected S3 URL');
            const expectedPath = this.generateExpectedS3Path(spaceId, hostUsername, createdAt);
            const expectedUrl = this.s3BaseUrl + expectedPath;
            
            console.log('Expected S3 path:', expectedPath);
            console.log('Expected S3 URL:', expectedUrl);
            
            // Check if this path exists in our mapping (might be stored with different key)
            const foundKey = Object.keys(this.mp3FilesMap).find(key => 
                this.mp3FilesMap[key] === expectedUrl
            );
            
            if (foundKey) {
                console.log('✅ Found via expected URL construction:', expectedUrl);
                return expectedUrl;
            }
            console.log('❌ Expected URL not found in mapping');
        }
        
        console.log('❌ No MP3 found for space:', spaceId);
        console.log('Available spaceId keys in map:');
        Object.keys(this.mp3FilesMap)
            .filter(key => !key.includes('/')) // Only show direct spaceId keys
            .slice(0, 5)
            .forEach(key => {
                console.log(`  "${key}"`);
            });
        
        return null;
    }

    /**
     * Generates expected S3 path for a space
     * @param {string} spaceId - Space ID
     * @param {string} hostUsername - Host username
     * @param {string} createdAt - Creation date
     * @returns {string} Expected S3 path
     */
    generateExpectedS3Path(spaceId, hostUsername, createdAt) {
        if (!spaceId) return '';
        
        // Default fallback if no host/date info
        if (!hostUsername || !createdAt) {
            return `spaces/${spaceId}.mp3`;
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
        
        return `${cleanHost}/${date}/${spaceId}.mp3`;
    }

    /**
     * Legacy method for backwards compatibility - now uses spaceId internally
     * @deprecated Use getMp3UrlBySpaceId instead
     */
    getMp3Url(host, title) {
        console.log('⚠️ Using legacy getMp3Url method - this is deprecated');
        console.log('Host:', host, 'Title:', title);
        
        // Try to find a space with this host and title to get spaceId
        // This is a fallback for legacy code
        const possibleKeys = Utils.createMappingKeys(host, title);
        console.log('Legacy mapping keys:', possibleKeys);
        
        for (const key of possibleKeys) {
            const found = this.mp3FilesMap[key];
            if (found) {
                console.log('✅ Found via legacy mapping:', found);
                return found;
            }
        }
        
        console.log('❌ No legacy mapping found');
        return null;
    }

    /**
     * Legacy method for backwards compatibility
     * @deprecated Use spaceId-based mapping instead
     */
    getMappingKeys(host, title) {
        return Utils.createMappingKeys(host, title);
    }

    getMp3FilesMap() {
        return this.mp3FilesMap;
    }
}

// Create global instance
const api = new ApiService();
window.api = api;