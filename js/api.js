/**
 * API communication layer for the Twitter Spaces Dashboard with debug logging
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
     * Loads and processes MP3 files for mapping with debug logging
     */
    async loadMp3Files() {
        try {
            console.log('🔄 Loading MP3 files...');
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
                        // Join everything after the date as the filename (handles slashes in filenames)
                        const filename = parts.slice(2).join('/');
                        
                        // Skip files that don't end with .mp3
                        if (!filename.toLowerCase().endsWith('.mp3')) {
                            console.log('❌ Skipping non-MP3 file');
                            return;
                        }
                        
                        console.log('Host username:', hostUsername);
                        console.log('Filename:', filename);
                        
                        // Extract title from filename
                        let titlePart = filename.replace(/\.mp3$/i, '');
                        console.log('Title after removing .mp3:', titlePart);
                        
                        // Try to remove host prefix if it exists
                        const hostPrefix = `${hostUsername}-`;
                        console.log('Host prefix to check:', hostPrefix);
                        
                        if (titlePart.startsWith(hostPrefix)) {
                            titlePart = titlePart.substring(hostPrefix.length);
                            console.log('Title after removing host prefix:', titlePart);
                        } else {
                            console.log('Host prefix not found in title');
                        }
                        
                        // Handle special cases where filename might not follow expected pattern
                        if (!titlePart || titlePart === hostUsername) {
                            titlePart = filename.replace(/\.mp3$/i, '');
                            console.log('Using fallback title:', titlePart);
                        }
                        
                        // Create multiple possible keys for mapping
                        const possibleKeys = Utils.createMappingKeys(hostUsername, titlePart);
                        console.log('Generated keys:', possibleKeys);
                        
                        // Store the file URL under all possible keys
                        possibleKeys.forEach(key => {
                            if (key) {
                                this.mp3FilesMap[key] = this.s3BaseUrl + filePath;
                                console.log(`Stored mapping: "${key}" -> URL`);
                            }
                        });
                    } else {
                        console.log('❌ Skipping file - not enough path parts');
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
     * Gets MP3 URL for a space with debug logging
     */
    getMp3Url(host, title) {
        console.log('\n🔍 Looking up MP3 for:');
        console.log('Host:', host);
        console.log('Title:', title);
        
        // Normalize host username (replace = with -)
        const normalizedHost = host.replace(/=/g, '-');
        console.log('Normalized host:', normalizedHost);
        
        const possibleKeys = Utils.createMappingKeys(normalizedHost, title);
        console.log('Generated lookup keys:', possibleKeys);
        
        console.log('Checking each key:');
        for (const key of possibleKeys) {
            const found = this.mp3FilesMap[key];
            console.log(`  "${key}" -> ${found ? 'FOUND' : 'NOT FOUND'}`);
            if (found) {
                console.log('✅ Match found! Returning:', found);
                return found;
            }
        }
        
        console.log('❌ No match found');
        console.log('Available keys in map:');
        Object.keys(this.mp3FilesMap).slice(0, 5).forEach(key => {
            console.log(`  "${key}"`);
        });
        
        return null;
    }

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