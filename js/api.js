/**
 * API communication layer for the Twitter Spaces Dashboard
 */

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.s3BaseUrl = CONFIG.S3_BASE_URL;
        this.mp3FilesMap = {};
    }

    /**
     * Makes an asynchronous request to the API endpoint.
     * @param {string} endpoint - The API endpoint to call.
     * @returns {Promise<Object>} The JSON response from the API.
     * @throws {Error} If the request fails.
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

    /**
     * Fetches statistics from the API
     * @returns {Promise<Object>} Statistics data
     */
    async getStats() {
        return await this.makeRequest('stats');
    }

    /**
     * Fetches spaces data with optional filters
     * @param {Object} filters - Filter options
     * @param {string} filters.status - Status filter (live/ended)
     * @param {number} filters.limit - Limit number of results
     * @returns {Promise<Object>} Spaces data
     */
    async getSpaces(filters = {}) {
        let endpoint = 'spaces?';
        const params = [];
        
        if (filters.limit) params.push(`limit=${filters.limit}`);
        if (filters.status) params.push(`status=${filters.status}`);
        
        endpoint += params.join('&');
        return await this.makeRequest(endpoint);
    }

    /**
     * Fetches detailed information for a specific space
     * @param {string} spaceId - The space ID
     * @returns {Promise<Object>} Space details
     */
    async getSpaceDetails(spaceId) {
        return await this.makeRequest(`spaces/${spaceId}`);
    }

    /**
     * Fetches participants for a specific space
     * @param {string} spaceId - The space ID
     * @returns {Promise<Object>} Participants data
     */
    async getSpaceParticipants(spaceId) {
        return await this.makeRequest(`spaces/${spaceId}/participants`);
    }

    /**
     * Fetches available MP3 files list
     * @returns {Promise<Object>} Files data
     */
    async getFiles() {
        return await this.makeRequest('files');
    }

    /**
     * Loads and processes MP3 files for mapping
     * @returns {Promise<void>}
     */
    async loadMp3Files() {
        try {
            const data = await this.getFiles();
            this.mp3FilesMap = {};

            if (data.files && Array.isArray(data.files)) {
                console.log('Processing MP3 files:', data.files);
                
                data.files.forEach(file => {
                    const filePath = file.name;
                    const parts = filePath.split('/');
                    
                    if (parts.length >= 3) {
                        const hostUsername = parts[0];
                        const filename = parts[2];
                        
                        // Extract title from filename
                        let titlePart = filename.replace(/\.mp3$/i, '');
                        
                        // Try to remove host prefix if it exists
                        const hostPrefix = `${hostUsername}-`;
                        if (titlePart.startsWith(hostPrefix)) {
                            titlePart = titlePart.substring(hostPrefix.length);
                        }
                        
                        // Handle special cases where filename might not follow expected pattern
                        if (!titlePart || titlePart === hostUsername) {
                            titlePart = filename.replace(/\.mp3$/i, '');
                        }
                        
                        // Create multiple possible keys for mapping
                        const possibleKeys = Utils.createMappingKeys(hostUsername, titlePart);
                        
                        // Store the file URL under all possible keys
                        possibleKeys.forEach(key => {
                            if (key) {
                                this.mp3FilesMap[key] = this.s3BaseUrl + filePath;
                            }
                        });
                        
                        console.log(`File: ${filename} -> Keys: ${possibleKeys.join(', ')}`);
                    }
                });
                
                console.log('Final MP3 mapping:', this.mp3FilesMap);
                Utils.showMessage(`Loaded ${Object.keys(this.mp3FilesMap).length} MP3 file mappings`, CONFIG.MESSAGE_TYPES.SUCCESS);
            }
        } catch (error) {
            Utils.showMessage(`Failed to load MP3 file list: ${error.message}`);
            console.error('MP3 files error:', error);
            throw error;
        }
    }

    /**
     * Gets MP3 URL for a space
     * @param {string} host - Host username
     * @param {string} title - Space title
     * @returns {string|null} MP3 URL or null if not found
     */
    getMp3Url(host, title) {
        const possibleKeys = Utils.createMappingKeys(host, title);
        const foundKey = possibleKeys.find(key => this.mp3FilesMap[key]);
        return foundKey ? this.mp3FilesMap[foundKey] : null;
    }

    /**
     * Gets all possible mapping keys for debugging
     * @param {string} host - Host username
     * @param {string} title - Space title
     * @returns {Array<string>} Array of possible keys
     */
    getMappingKeys(host, title) {
        return Utils.createMappingKeys(host, title);
    }

    /**
     * Gets the MP3 files mapping object
     * @returns {Object} MP3 files mapping
     */
    getMp3FilesMap() {
        return this.mp3FilesMap;
    }
}

// Create global instance
const api = new ApiService();
window.api = api;
