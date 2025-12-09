import { useState, useMemo } from 'react';
import {
    Folder,
    File,
    Trash2,
    RefreshCw,
    ChevronRight,
    Search,
    Image as ImageIcon,
    X,
    Move,
    FolderPlus,
    AlertTriangle,
    Info
} from 'lucide-react';
import {
    useImageKitFiles,
    useCreateFolder,
    useDeleteFolder,
    useDeleteImageKitFile,
    useMoveFile,
    useBulkDeleteFiles
} from '@/lib/hooks/useImageKit';
import { ImageKitFile } from '@/lib/api/imagekit';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function ImageKitManager() {
    const { showToast, showConfirm } = useToast();

    // State
    const [currentPath, setCurrentPath] = useState('/');
    const [search, setSearch] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveDestination, setMoveDestination] = useState('');
    const [fileDetailsId, setFileDetailsId] = useState<string | null>(null);

    const debouncedSearch = useDebounce(search, 300);

    // API Hooks
    const { data, isLoading, isError, refetch } = useImageKitFiles({
        path: currentPath,
        searchQuery: debouncedSearch || undefined,
        limit: 100
    });

    const createFolderMutation = useCreateFolder();
    const deleteFolderMutation = useDeleteFolder();
    const deleteFileMutation = useDeleteImageKitFile();
    const moveFileMutation = useMoveFile();
    const bulkDeleteMutation = useBulkDeleteFiles();

    const files = data?.data || [];

    // Separate folders and files - ImageKit uses 'fileType' property
    const { folders, fileItems } = useMemo(() => {
        const f: ImageKitFile[] = [];
        const fi: ImageKitFile[] = [];
        files.forEach(item => {
            // ImageKit folders have fileType === 'folder' or type === 'folder'
            if (item.type === 'folder' || (item as any).fileType === 'folder') {
                f.push(item);
            } else {
                fi.push(item);
            }
        });
        return { folders: f, fileItems: fi };
    }, [files]);

    // Breadcrumb parts - ensure currentPath is defined
    const pathParts = (currentPath || '/').split('/').filter(Boolean);

    // Handlers
    const handleNavigate = (path: string | undefined) => {
        const safePath = path || '/';
        setCurrentPath(safePath);
        setSelectedFiles([]);
        setSearch('');
    };

    // Build folder path from current path + folder name
    const getFolderPath = (folderName: string) => {
        const base = currentPath === '/' ? '' : currentPath;
        return `${base}/${folderName}`;
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            handleNavigate('/');
        } else {
            const newPath = '/' + pathParts.slice(0, index + 1).join('/');
            handleNavigate(newPath);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await createFolderMutation.mutateAsync({
                folderName: newFolderName,
                parentFolderPath: currentPath
            });
            showToast(`Folder '${newFolderName}' created`, 'success');
            setNewFolderName('');
            setShowCreateFolder(false);
        } catch (error: any) {
            showToast(error.message || 'Failed to create folder', 'error');
        }
    };

    const handleDeleteFolder = (folderPath: string) => {
        showConfirm({
            title: 'Delete Folder',
            message: `Delete folder "${folderPath}" and ALL its contents? This cannot be undone.`,
            confirmText: 'DELETE',
            onConfirm: async () => {
                try {
                    await deleteFolderMutation.mutateAsync(folderPath);
                    showToast('Folder deleted', 'success');
                } catch (error: any) {
                    showToast(error.message || 'Failed to delete folder', 'error');
                }
            }
        });
    };

    const handleDeleteFile = (fileId: string) => {
        showConfirm({
            title: 'Delete File',
            message: 'Delete this file? This cannot be undone.',
            confirmText: 'DELETE',
            onConfirm: async () => {
                try {
                    await deleteFileMutation.mutateAsync(fileId);
                    showToast('File deleted', 'success');
                    setSelectedFiles(prev => prev.filter(id => id !== fileId));
                } catch (error: any) {
                    showToast(error.message || 'Failed to delete file', 'error');
                }
            }
        });
    };

    const handleBulkDelete = () => {
        showConfirm({
            title: 'Bulk Delete',
            message: `Delete ${selectedFiles.length} files? This cannot be undone.`,
            confirmText: 'DELETE ALL',
            onConfirm: async () => {
                try {
                    await bulkDeleteMutation.mutateAsync(selectedFiles);
                    showToast(`${selectedFiles.length} files deleted`, 'success');
                    setSelectedFiles([]);
                } catch (error: any) {
                    showToast(error.message || 'Failed to delete files', 'error');
                }
            }
        });
    };

    const handleMoveFiles = async () => {
        if (!moveDestination.trim() || selectedFiles.length === 0) return;
        try {
            // Move one file at a time
            for (const fileId of selectedFiles) {
                const file = files.find(f => f.fileId === fileId);
                if (file) {
                    await moveFileMutation.mutateAsync({
                        sourceFilePath: file.filePath,
                        destinationPath: moveDestination
                    });
                }
            }
            showToast(`${selectedFiles.length} files moved`, 'success');
            setSelectedFiles([]);
            setShowMoveModal(false);
            setMoveDestination('');
        } catch (error: any) {
            showToast(error.message || 'Failed to move files', 'error');
        }
    };

    const toggleSelect = (fileId: string) => {
        setSelectedFiles(prev =>
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const selectAll = () => {
        if (selectedFiles.length === fileItems.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(fileItems.map(f => f.fileId));
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">
                        ImageKit Manager
                    </h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        SUPER ADMIN • DIRECT IMAGEKIT ACCESS
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedFiles.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowMoveModal(true)}
                                className="px-3 py-2 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                            >
                                <Move size={14} />
                                Move ({selectedFiles.length})
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-2 bg-red-500/10 text-red-400 text-xs font-bold uppercase hover:bg-red-500/20 transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={14} />
                                Delete ({selectedFiles.length})
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowCreateFolder(true)}
                        className="px-3 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                    >
                        <FolderPlus size={14} />
                        New Folder
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase hover:bg-zinc-700 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4 text-sm">
                <button
                    onClick={() => handleBreadcrumbClick(-1)}
                    className={`px-2 py-1 ${currentPath === '/' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
                >
                    Root
                </button>
                {pathParts.map((part, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <ChevronRight size={14} className="text-zinc-600" />
                        <button
                            onClick={() => handleBreadcrumbClick(index)}
                            className={`px-2 py-1 ${index === pathParts.length - 1 ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
                        >
                            {part}
                        </button>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                    type="text"
                    placeholder="Search files..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
                />
            </div>

            {/* Error State */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-20 border border-red-500/30 bg-red-500/5 mb-6">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <p className="text-red-400 font-medium">Failed to load files</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Loading State */}
            {isLoading && !isError && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-square bg-[#0A0A0A] border border-[#27272a] animate-pulse" />
                    ))}
                </div>
            )}

            {/* Content */}
            {!isLoading && !isError && (
                <>
                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3">
                                Folders ({folders.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {folders.map((folder) => (
                                    <div
                                        key={folder.fileId || folder.name}
                                        className="group p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors cursor-pointer relative"
                                        onClick={() => handleNavigate(getFolderPath(folder.name))}
                                    >
                                        <Folder size={32} className="text-amber-500 mb-2" />
                                        <p className="text-sm text-white truncate">{folder.name}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFolder(getFolderPath(folder.name));
                                            }}
                                            className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    {fileItems.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                    Files ({fileItems.length})
                                </h3>
                                <button
                                    onClick={selectAll}
                                    className="text-[10px] text-zinc-500 hover:text-white uppercase"
                                >
                                    {selectedFiles.length === fileItems.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {fileItems.map((file) => (
                                    <div
                                        key={file.fileId}
                                        className={`group relative aspect-square bg-[#0A0A0A] border transition-colors overflow-hidden ${selectedFiles.includes(file.fileId)
                                            ? 'border-emerald-500'
                                            : 'border-[#27272a] hover:border-zinc-600'
                                            }`}
                                    >
                                        {/* Thumbnail */}
                                        {file.mime?.startsWith('image/') ? (
                                            <img
                                                src={file.thumbnailUrl || file.url}
                                                alt={file.name}
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => toggleSelect(file.fileId)}
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center cursor-pointer"
                                                onClick={() => toggleSelect(file.fileId)}
                                            >
                                                <File size={32} className="text-zinc-600" />
                                            </div>
                                        )}

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                                            <div className="flex justify-between items-start pointer-events-auto">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFiles.includes(file.fileId)}
                                                    onChange={() => toggleSelect(file.fileId)}
                                                    className="w-4 h-4 bg-black border border-zinc-500 rounded checked:bg-emerald-500"
                                                />
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setFileDetailsId(file.fileId)}
                                                        className="p-1 text-zinc-400 hover:text-white"
                                                        title="Details"
                                                    >
                                                        <Info size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteFile(file.fileId)}
                                                        className="p-1 text-zinc-400 hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="pointer-events-none">
                                                <p className="text-[10px] text-white truncate">{file.name}</p>
                                                <p className="text-[9px] text-zinc-500">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {folders.length === 0 && fileItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 border border-[#27272a] bg-[#0A0A0A] border-dashed">
                            <ImageIcon size={48} className="text-zinc-800 mb-4" />
                            <p className="text-zinc-500 font-medium">This folder is empty</p>
                            <button
                                onClick={() => setShowCreateFolder(true)}
                                className="mt-4 px-4 py-2 bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
                            >
                                Create Folder
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Create Folder Modal */}
            {showCreateFolder && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h3 className="text-white font-bold mb-4">Create New Folder</h3>
                        <p className="text-zinc-500 text-sm mb-4">
                            Creating in: <span className="text-zinc-300">{currentPath}</span>
                        </p>
                        <input
                            type="text"
                            placeholder="Folder name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white text-sm mb-4 focus:outline-none focus:border-zinc-500"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setShowCreateFolder(false);
                                    setNewFolderName('');
                                }}
                                className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                                className="px-4 py-2 bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 disabled:opacity-50"
                            >
                                {createFolderMutation.isPending ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Files Modal */}
            {showMoveModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h3 className="text-white font-bold mb-4">Move {selectedFiles.length} Files</h3>
                        <p className="text-zinc-500 text-sm mb-4">
                            Enter destination folder path (e.g., /products/new)
                        </p>
                        <input
                            type="text"
                            placeholder="/destination/path"
                            value={moveDestination}
                            onChange={(e) => setMoveDestination(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white text-sm mb-4 focus:outline-none focus:border-zinc-500"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setShowMoveModal(false);
                                    setMoveDestination('');
                                }}
                                className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMoveFiles}
                                disabled={!moveDestination.trim() || moveFileMutation.isPending}
                                className="px-4 py-2 bg-blue-500 text-white font-bold text-sm hover:bg-blue-400 disabled:opacity-50"
                            >
                                {moveFileMutation.isPending ? 'Moving...' : 'Move'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Details Modal */}
            {fileDetailsId && (
                <FileDetailsModal
                    fileId={fileDetailsId}
                    onClose={() => setFileDetailsId(null)}
                />
            )}
        </div>
    );
}

// File Details Modal Component
function FileDetailsModal({ fileId, onClose }: { fileId: string; onClose: () => void }) {
    const { data, isLoading } = useImageKitFiles({ path: '/', limit: 1000 });
    const file = data?.data?.find(f => f.fileId === fileId);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                    <p className="text-zinc-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!file) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-white font-bold">File Details</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {file.mime?.startsWith('image/') && (
                    <img
                        src={file.url}
                        alt={file.name}
                        className="w-full max-h-64 object-contain bg-zinc-900 mb-4"
                    />
                )}

                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                        <span className="text-zinc-500">Name</span>
                        <span className="text-white truncate ml-4">{file.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                        <span className="text-zinc-500">Path</span>
                        <span className="text-white truncate ml-4">{file.filePath}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                        <span className="text-zinc-500">Size</span>
                        <span className="text-white">{file.size ? `${(file.size / 1024).toFixed(1)} KB` : '-'}</span>
                    </div>
                    {file.width && file.height && (
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                            <span className="text-zinc-500">Dimensions</span>
                            <span className="text-white">{file.width} × {file.height}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                        <span className="text-zinc-500">Type</span>
                        <span className="text-white">{file.mime || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                        <span className="text-zinc-500">Created</span>
                        <span className="text-white">{new Date(file.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">URL</span>
                        <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 truncate ml-4"
                        >
                            Open
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
