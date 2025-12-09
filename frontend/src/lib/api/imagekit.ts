import api from './axios';

export interface ImageKitFile {
    fileId: string;
    name: string;
    filePath: string;
    url: string;
    thumbnailUrl?: string;
    type: 'file' | 'folder';
    mime?: string;
    size?: number;
    width?: number;
    height?: number;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
    customMetadata?: Record<string, any>;
}

export interface ListFilesParams {
    path?: string;
    skip?: number;
    limit?: number;
    searchQuery?: string;
    type?: 'file' | 'folder' | 'all';
}

export interface ListFilesResponse {
    success: boolean;
    data: ImageKitFile[];
    count: number;
    path: string;
}

export interface CreateFolderParams {
    folderName: string;
    parentFolderPath?: string;
}

export interface MoveCopyFileParams {
    sourceFilePath: string;
    destinationPath: string;
}

// API Functions
export const imagekitApi = {
    /**
     * List files and folders at a given path
     */
    listFiles: async (params: ListFilesParams = {}): Promise<ListFilesResponse> => {
        const searchParams = new URLSearchParams();
        if (params.path) searchParams.append('path', params.path);
        if (params.skip) searchParams.append('skip', String(params.skip));
        if (params.limit) searchParams.append('limit', String(params.limit));
        if (params.searchQuery) searchParams.append('searchQuery', params.searchQuery);
        if (params.type) searchParams.append('type', params.type);

        const response = await api.get(`/super-admin/imagekit/files?${searchParams.toString()}`);
        return response.data;
    },

    /**
     * Get details for a specific file
     */
    getFileDetails: async (fileId: string): Promise<{ success: boolean; data: ImageKitFile }> => {
        const response = await api.get(`/super-admin/imagekit/files/${fileId}`);
        return response.data;
    },

    /**
     * Create a new folder
     */
    createFolder: async (params: CreateFolderParams): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/super-admin/imagekit/folders', params);
        return response.data;
    },

    /**
     * Delete a folder and all its contents
     */
    deleteFolder: async (folderPath: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete('/super-admin/imagekit/folders', {
            data: { folderPath }
        });
        return response.data;
    },

    /**
     * Delete a single file
     */
    deleteFile: async (fileId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/super-admin/imagekit/files/${fileId}`);
        return response.data;
    },

    /**
     * Move a file to a different folder
     */
    moveFile: async (params: MoveCopyFileParams): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/super-admin/imagekit/files/move', params);
        return response.data;
    },

    /**
     * Copy a file to a different folder
     */
    copyFile: async (params: MoveCopyFileParams): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/super-admin/imagekit/files/copy', params);
        return response.data;
    },

    /**
     * Delete multiple files at once
     */
    bulkDelete: async (fileIds: string[]): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/super-admin/imagekit/files/bulk-delete', { fileIds });
        return response.data;
    }
};

export default imagekitApi;
