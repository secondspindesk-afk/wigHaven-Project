import api from './axios';

// ==================== TYPES ====================

export interface UploadResponse {
    fileId: string;
    url: string;
    thumbnailUrl: string;
    name: string;
    filePath: string;
    size?: number;
    width?: number;
    height?: number;
}

export interface DuplicateCheckResponse {
    isDuplicate: boolean;
    existingFile?: {
        id: string;
        fileId: string;
        url: string;
        fileName: string;
    };
}

export interface UploadFromUrlResponse {
    success: boolean;
    url: string;
    fileId: string;
    fileName: string;
    mediaId?: string;
}

// Helper to extract data from API response wrapper
function extractData<T>(response: { data: { success: boolean; data: T } | T }): T {
    const outerData = response.data;
    if (outerData && typeof outerData === 'object' && 'success' in outerData && 'data' in outerData) {
        return (outerData as { success: boolean; data: T }).data;
    }
    return outerData as T;
}

// ==================== API FUNCTIONS ====================

export const uploadApi = {
    /**
     * Check if file is a duplicate before uploading
     * Returns existing file info if duplicate found
     */
    checkDuplicate: async (file: File): Promise<DuplicateCheckResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/upload/check-hash', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return extractData(response);
    },

    /**
     * Upload image to ImageKit
     * @param file - File to upload
     * @param type - Type of upload (product, category, variant, review)
     * @param force - If true, bypasses duplicate check
     * @returns Upload response or throws error
     * @throws 409 error if duplicate found (handle in UI to show confirmation)
     */
    uploadImage: async (
        file: File,
        type: 'product' | 'category' | 'variant' | 'review' | 'banner' = 'variant',
        force: boolean = false
    ): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const url = force ? `/upload?type=${type}&force=true` : `/upload?type=${type}`;
            const response = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return extractData(response);
        } catch (error: any) {
            // Check for duplicate (409 Conflict)
            if (error.response?.status === 409) {
                const duplicateData = error.response.data;
                throw {
                    isDuplicate: true,
                    existingFile: duplicateData.existingFile || duplicateData.data?.existingFile,
                    message: duplicateData.message || duplicateData.error?.message || 'Duplicate image detected'
                };
            }
            throw error;
        }
    },

    /**
     * Upload image from external URL (will be saved to ImageKit)
     * External URLs are automatically uploaded to ImageKit for CDN benefits
     */
    uploadFromUrl: async (
        imageUrl: string,
        type: 'product' | 'category' | 'variant' | 'review' | 'banner' = 'variant'
    ): Promise<UploadFromUrlResponse> => {
        const response = await api.post('/upload/url', {
            imageUrl,
            type
        });
        return extractData(response);
    },

    /**
     * Delete image from ImageKit (soft delete - moves to trash)
     */
    deleteImage: async (url: string): Promise<void> => {
        await api.delete('/upload', { data: { url } });
    }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Smart upload handler that checks for duplicates first
 * Returns existing URL if duplicate, uploads if new
 */
export async function smartUpload(
    file: File,
    type: 'product' | 'category' | 'variant' | 'review' | 'banner' = 'variant',
    onDuplicateFound?: (existing: DuplicateCheckResponse['existingFile']) => Promise<'use_existing' | 'upload_anyway'>
): Promise<{ url: string; isExisting: boolean }> {
    // First check for duplicate
    const check = await uploadApi.checkDuplicate(file);

    if (check.isDuplicate && check.existingFile) {
        // Ask user what to do if callback provided
        if (onDuplicateFound) {
            const decision = await onDuplicateFound(check.existingFile);
            if (decision === 'use_existing') {
                return { url: check.existingFile.url, isExisting: true };
            }
        } else {
            // Default: use existing
            return { url: check.existingFile.url, isExisting: true };
        }
    }

    // Upload new file (force=true to bypass any server-side duplicate check)
    const result = await uploadApi.uploadImage(file, type, true);
    return { url: result.url, isExisting: false };
}

/**
 * Check if URL is already an ImageKit URL
 */
export function isImageKitUrl(url: string): boolean {
    return url.includes('ik.imagekit.io');
}

/**
 * Process array of image URLs - upload external ones to ImageKit
 */
export async function processImageUrls(
    urls: string[],
    type: 'product' | 'category' | 'variant' | 'review' | 'banner' = 'variant'
): Promise<string[]> {
    const results: string[] = [];

    for (const url of urls) {
        if (isImageKitUrl(url)) {
            // Already ImageKit URL, keep as is
            results.push(url);
        } else {
            // External URL - upload to ImageKit
            try {
                const uploaded = await uploadApi.uploadFromUrl(url, type);
                results.push(uploaded.url);
            } catch (error) {
                console.error(`Failed to upload external URL: ${url}`, error);
                // Keep original URL if upload fails
                results.push(url);
            }
        }
    }

    return results;
}

export default uploadApi;
