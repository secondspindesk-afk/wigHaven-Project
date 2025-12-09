import { useMutation, useQueryClient } from '@tanstack/react-query';
import uploadApi, { UploadResponse, DuplicateCheckResponse } from '../api/upload';

// ==================== UPLOAD HOOKS ====================

/**
 * Upload image mutation
 * Handles 409 duplicate errors - catch and show confirmation dialog
 */
export function useUploadImage() {
    return useMutation({
        mutationFn: async ({
            file,
            type = 'variant',
            force = false
        }: {
            file: File;
            type?: 'product' | 'category' | 'variant' | 'review';
            force?: boolean;
        }): Promise<UploadResponse> => {
            return uploadApi.uploadImage(file, type, force);
        },
        onError: (error: any) => {
            // Duplicate errors have isDuplicate = true
            // Let the component handle the UI for this
            if (error.isDuplicate) {
                console.log('Duplicate image detected:', error.existingFile);
            }
        }
    });
}

/**
 * Check for duplicate before upload
 */
export function useCheckDuplicate() {
    return useMutation({
        mutationFn: (file: File): Promise<DuplicateCheckResponse> => {
            return uploadApi.checkDuplicate(file);
        }
    });
}

/**
 * Upload from external URL (auto-uploads to ImageKit)
 */
export function useUploadFromUrl() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ imageUrl, type = 'variant' }: { imageUrl: string; type?: 'product' | 'category' | 'variant' | 'review' }) => {
            return uploadApi.uploadFromUrl(imageUrl, type);
        },
        onSuccess: () => {
            // Invalidate media queries to refresh library
            queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
        }
    });
}

/**
 * Delete image (soft delete - moves to trash)
 */
export function useDeleteImage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (url: string) => uploadApi.deleteImage(url),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
        }
    });
}

// ==================== HELPER STATE TYPE ====================

export interface UploadState {
    isUploading: boolean;
    progress: number;
    error: string | null;
    duplicateFile: DuplicateCheckResponse['existingFile'] | null;
}

export const initialUploadState: UploadState = {
    isUploading: false,
    progress: 0,
    error: null,
    duplicateFile: null
};
