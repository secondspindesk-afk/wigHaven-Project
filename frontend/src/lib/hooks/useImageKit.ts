import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { imagekitApi, ListFilesParams, CreateFolderParams, MoveCopyFileParams } from '../api/imagekit';

// Query key factory
const imagekitKeys = {
    all: ['imagekit'] as const,
    files: (params?: ListFilesParams) => [...imagekitKeys.all, 'files', params] as const,
    fileDetails: (fileId: string) => [...imagekitKeys.all, 'file', fileId] as const,
};

/**
 * Hook to list files and folders
 */
export function useImageKitFiles(params: ListFilesParams = {}) {
    return useQuery({
        queryKey: imagekitKeys.files(params),
        queryFn: () => imagekitApi.listFiles(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to get file details
 */
export function useImageKitFileDetails(fileId: string) {
    return useQuery({
        queryKey: imagekitKeys.fileDetails(fileId),
        queryFn: () => imagekitApi.getFileDetails(fileId),
        enabled: !!fileId,
    });
}

/**
 * Hook to create a folder
 */
export function useCreateFolder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: CreateFolderParams) => imagekitApi.createFolder(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: imagekitKeys.all });
        },
    });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (folderPath: string) => imagekitApi.deleteFolder(folderPath),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: imagekitKeys.all });
        },
    });
}

/**
 * Hook to delete a file
 */
export function useDeleteImageKitFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (fileId: string) => imagekitApi.deleteFile(fileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: imagekitKeys.all });
        },
    });
}

/**
 * Hook to move a file
 */
export function useMoveFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: MoveCopyFileParams) => imagekitApi.moveFile(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: imagekitKeys.all });
        },
    });
}

/**
 * Hook to copy a file
 */
export function useCopyFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: MoveCopyFileParams) => imagekitApi.copyFile(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: imagekitKeys.all });
        },
    });
}

/**
 * Hook to bulk delete files
 */
export function useBulkDeleteFiles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (fileIds: string[]) => imagekitApi.bulkDelete(fileIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: imagekitKeys.all });
        },
    });
}
