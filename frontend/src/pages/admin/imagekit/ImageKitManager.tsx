import { useState, useMemo } from 'react';
import { Folder, File, Trash2, RefreshCw, ChevronRight, Search, Image as ImageIcon, X, Move, FolderPlus, AlertTriangle, Info } from 'lucide-react';
import { useImageKitFiles, useCreateFolder, useDeleteFolder, useDeleteImageKitFile, useMoveFile, useBulkDeleteFiles } from '@/lib/hooks/useImageKit';
import { ImageKitFile } from '@/lib/api/imagekit';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function ImageKitManager() {
    const { showToast, showConfirm } = useToast();
    const isMobile = useIsMobile();
    const [currentPath, setCurrentPath] = useState('/');
    const [search, setSearch] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveDestination, setMoveDestination] = useState('');
    const [fileDetailsId, setFileDetailsId] = useState<string | null>(null);

    const debouncedSearch = useDebounce(search, 300);
    const { data, isLoading, isError, refetch } = useImageKitFiles({ path: currentPath, searchQuery: debouncedSearch || undefined, limit: 100 });
    const createFolderMutation = useCreateFolder();
    const deleteFolderMutation = useDeleteFolder();
    const deleteFileMutation = useDeleteImageKitFile();
    const moveFileMutation = useMoveFile();
    const bulkDeleteMutation = useBulkDeleteFiles();

    const files = data?.data || [];
    const { folders, fileItems } = useMemo(() => {
        const f: ImageKitFile[] = [], fi: ImageKitFile[] = [];
        files.forEach(item => { if (item.type === 'folder' || (item as any).fileType === 'folder') f.push(item); else fi.push(item); });
        return { folders: f, fileItems: fi };
    }, [files]);

    const pathParts = (currentPath || '/').split('/').filter(Boolean);
    const handleNavigate = (path: string | undefined) => { setCurrentPath(path || '/'); setSelectedFiles([]); setSearch(''); };
    const getFolderPath = (folderName: string) => `${currentPath === '/' ? '' : currentPath}/${folderName}`;
    const handleBreadcrumbClick = (index: number) => handleNavigate(index === -1 ? '/' : '/' + pathParts.slice(0, index + 1).join('/'));

    const handleCreateFolder = async () => { if (!newFolderName.trim()) return; try { await createFolderMutation.mutateAsync({ folderName: newFolderName, parentFolderPath: currentPath }); showToast(`Folder created`, 'success'); setNewFolderName(''); setShowCreateFolder(false); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } };
    const handleDeleteFolder = (folderPath: string) => { showConfirm({ title: 'Delete Folder', message: `Delete "${folderPath}" and ALL contents?`, confirmText: 'DELETE', onConfirm: async () => { try { await deleteFolderMutation.mutateAsync(folderPath); showToast('Deleted', 'success'); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } } }); };
    const handleDeleteFile = (fileId: string) => { showConfirm({ title: 'Delete File', message: 'Delete this file?', confirmText: 'DELETE', onConfirm: async () => { try { await deleteFileMutation.mutateAsync(fileId); showToast('Deleted', 'success'); setSelectedFiles(p => p.filter(id => id !== fileId)); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } } }); };
    const handleBulkDelete = () => { showConfirm({ title: 'Bulk Delete', message: `Delete ${selectedFiles.length} files?`, confirmText: 'DELETE ALL', onConfirm: async () => { try { await bulkDeleteMutation.mutateAsync(selectedFiles); showToast(`${selectedFiles.length} deleted`, 'success'); setSelectedFiles([]); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } } }); };
    const handleMoveFiles = async () => { if (!moveDestination.trim() || selectedFiles.length === 0) return; try { for (const fileId of selectedFiles) { const file = files.find(f => f.fileId === fileId); if (file) await moveFileMutation.mutateAsync({ sourceFilePath: file.filePath, destinationPath: moveDestination }); } showToast(`${selectedFiles.length} moved`, 'success'); setSelectedFiles([]); setShowMoveModal(false); setMoveDestination(''); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } };
    const toggleSelect = (fileId: string) => setSelectedFiles(p => p.includes(fileId) ? p.filter(id => id !== fileId) : [...p, fileId]);
    const selectAll = () => setSelectedFiles(selectedFiles.length === fileItems.length ? [] : fileItems.map(f => f.fileId));
    const formatFileSize = (bytes?: number) => { if (!bytes) return '-'; if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; };

    // ==================== MOBILE ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><ImageIcon size={18} className="text-white" /><h1 className="text-lg text-white font-semibold">ImageKit</h1></div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowCreateFolder(true)} className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl"><FolderPlus size={16} /></button>
                        <button onClick={() => refetch()} className="p-2.5 bg-zinc-800 text-zinc-400 rounded-xl"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /></button>
                    </div>
                </div>

                {/* Selection Actions */}
                {selectedFiles.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={() => setShowMoveModal(true)} className="flex-1 py-2.5 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2"><Move size={14} />Move ({selectedFiles.length})</button>
                        <button onClick={handleBulkDelete} className="flex-1 py-2.5 bg-red-500/10 text-red-400 text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2"><Trash2 size={14} />Delete ({selectedFiles.length})</button>
                    </div>
                )}

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    <button onClick={() => handleBreadcrumbClick(-1)} className={`px-3 py-2 text-xs rounded-lg shrink-0 ${currentPath === '/' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}>Root</button>
                    {pathParts.map((part, index) => (
                        <div key={index} className="flex items-center gap-1 shrink-0"><ChevronRight size={12} className="text-zinc-600" /><button onClick={() => handleBreadcrumbClick(index)} className={`px-3 py-2 text-xs rounded-lg ${index === pathParts.length - 1 ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}>{part}</button></div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-zinc-900/50 border border-zinc-800/50 text-white text-sm rounded-xl" /></div>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Error */}
                {isError && <div className="flex flex-col items-center justify-center py-16"><AlertTriangle size={40} className="text-red-500 mb-3" /><p className="text-red-400 text-sm">Failed to load</p><button onClick={() => refetch()} className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 text-xs rounded-lg">Retry</button></div>}

                {/* Loading */}
                {isLoading && !isError && <div className="grid grid-cols-3 gap-2">{[...Array(9)].map((_, i) => <div key={i} className="aspect-square bg-zinc-800 rounded-xl animate-pulse" />)}</div>}

                {/* Content */}
                {!isLoading && !isError && (
                    <>
                        {/* Folders */}
                        {folders.length > 0 && (
                            <div>
                                <h3 className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Folders ({folders.length})</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {folders.map((folder) => (
                                        <div key={folder.fileId || folder.name} onClick={() => handleNavigate(getFolderPath(folder.name))} className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                                            <Folder size={24} className="text-amber-500 mb-2" />
                                            <p className="text-xs text-white truncate">{folder.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files */}
                        {fileItems.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[10px] text-zinc-500 uppercase font-bold">Files ({fileItems.length})</h3>
                                    <button onClick={selectAll} className="text-[10px] text-zinc-500">{selectedFiles.length === fileItems.length ? 'Deselect' : 'Select All'}</button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {fileItems.map((file) => (
                                        <div key={file.fileId} onClick={() => toggleSelect(file.fileId)} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${selectedFiles.includes(file.fileId) ? 'border-emerald-500' : 'border-transparent'}`}>
                                            {file.mime?.startsWith('image/') ? <img src={file.thumbnailUrl || file.url} alt={file.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><File size={24} className="text-zinc-600" /></div>}
                                            <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                                <p className="text-[9px] text-white truncate">{file.name}</p>
                                                <p className="text-[8px] text-zinc-400">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty */}
                        {folders.length === 0 && fileItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16"><ImageIcon size={40} className="text-zinc-700 mb-3" /><p className="text-zinc-500 text-sm">Empty folder</p><button onClick={() => setShowCreateFolder(true)} className="mt-3 px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-lg">Create Folder</button></div>
                        )}
                    </>
                )}

                {/* Create Folder Bottom Sheet */}
                {showCreateFolder && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowCreateFolder(false)}>
                        <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-2xl w-full max-w-lg p-5 pb-8" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold text-white">New Folder</h3><button onClick={() => setShowCreateFolder(false)} className="p-2 text-zinc-500"><X size={18} /></button></div>
                            <p className="text-xs text-zinc-500 mb-3">Creating in: <span className="text-zinc-300">{currentPath}</span></p>
                            <input type="text" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl mb-4" autoFocus />
                            <div className="flex gap-3">
                                <button onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }} className="flex-1 py-3 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase rounded-xl">Cancel</button>
                                <button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolderMutation.isPending} className="flex-1 py-3 bg-emerald-500 text-black text-xs font-bold uppercase rounded-xl disabled:opacity-50">{createFolderMutation.isPending ? '...' : 'Create'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Move Bottom Sheet */}
                {showMoveModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowMoveModal(false)}>
                        <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-2xl w-full max-w-lg p-5 pb-8" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold text-white">Move {selectedFiles.length} Files</h3><button onClick={() => setShowMoveModal(false)} className="p-2 text-zinc-500"><X size={18} /></button></div>
                            <input type="text" placeholder="/destination/path" value={moveDestination} onChange={(e) => setMoveDestination(e.target.value)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl mb-4" autoFocus />
                            <div className="flex gap-3">
                                <button onClick={() => { setShowMoveModal(false); setMoveDestination(''); }} className="flex-1 py-3 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase rounded-xl">Cancel</button>
                                <button onClick={handleMoveFiles} disabled={!moveDestination.trim() || moveFileMutation.isPending} className="flex-1 py-3 bg-blue-500 text-white text-xs font-bold uppercase rounded-xl disabled:opacity-50">{moveFileMutation.isPending ? '...' : 'Move'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== DESKTOP ====================
    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-xl text-white font-medium uppercase tracking-tight">ImageKit Manager</h1><p className="text-[10px] text-zinc-500 font-mono mt-1">SUPER ADMIN • DIRECT IMAGEKIT ACCESS</p></div>
                <div className="flex gap-2">
                    {selectedFiles.length > 0 && (<><button onClick={() => setShowMoveModal(true)} className="px-3 py-2 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase flex items-center gap-2"><Move size={14} />Move ({selectedFiles.length})</button><button onClick={handleBulkDelete} className="px-3 py-2 bg-red-500/10 text-red-400 text-xs font-bold uppercase flex items-center gap-2"><Trash2 size={14} />Delete ({selectedFiles.length})</button></>)}
                    <button onClick={() => setShowCreateFolder(true)} className="px-3 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase flex items-center gap-2"><FolderPlus size={14} />New Folder</button>
                    <button onClick={() => refetch()} className="px-3 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase flex items-center gap-2"><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />Refresh</button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4 text-sm">
                <button onClick={() => handleBreadcrumbClick(-1)} className={`px-2 py-1 ${currentPath === '/' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}>Root</button>
                {pathParts.map((part, index) => (<div key={index} className="flex items-center gap-2"><ChevronRight size={14} className="text-zinc-600" /><button onClick={() => handleBreadcrumbClick(index)} className={`px-2 py-1 ${index === pathParts.length - 1 ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}>{part}</button></div>))}
            </div>

            <div className="relative max-w-md mb-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} /><input type="text" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm" /></div>

            {isError && <div className="flex flex-col items-center justify-center py-20 border border-red-500/30 bg-red-500/5 mb-6"><AlertTriangle size={48} className="text-red-500 mb-4" /><p className="text-red-400 font-medium">Failed to load files</p><button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 text-sm">Try Again</button></div>}
            {isLoading && !isError && <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-[#0A0A0A] border border-[#27272a] animate-pulse" />)}</div>}

            {!isLoading && !isError && (
                <>
                    {folders.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3">Folders ({folders.length})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {folders.map((folder) => (
                                    <div key={folder.fileId || folder.name} className="group p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 cursor-pointer relative" onClick={() => handleNavigate(getFolderPath(folder.name))}>
                                        <Folder size={32} className="text-amber-500 mb-2" /><p className="text-sm text-white truncate">{folder.name}</p>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(getFolderPath(folder.name)); }} className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {fileItems.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3"><h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Files ({fileItems.length})</h3><button onClick={selectAll} className="text-[10px] text-zinc-500 hover:text-white uppercase">{selectedFiles.length === fileItems.length ? 'Deselect All' : 'Select All'}</button></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {fileItems.map((file) => (
                                    <div key={file.fileId} className={`group relative aspect-square bg-[#0A0A0A] border ${selectedFiles.includes(file.fileId) ? 'border-emerald-500' : 'border-[#27272a] hover:border-zinc-600'}`}>
                                        {file.mime?.startsWith('image/') ? <img src={file.thumbnailUrl || file.url} alt={file.name} className="w-full h-full object-cover cursor-pointer" onClick={() => toggleSelect(file.fileId)} /> : <div className="w-full h-full flex items-center justify-center cursor-pointer" onClick={() => toggleSelect(file.fileId)}><File size={32} className="text-zinc-600" /></div>}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-2 pointer-events-none">
                                            <div className="flex justify-between items-start pointer-events-auto"><input type="checkbox" checked={selectedFiles.includes(file.fileId)} onChange={() => toggleSelect(file.fileId)} className="w-4 h-4 bg-black border border-zinc-500 rounded checked:bg-emerald-500" /><div className="flex gap-1"><button onClick={() => setFileDetailsId(file.fileId)} className="p-1 text-zinc-400 hover:text-white"><Info size={14} /></button><button onClick={() => handleDeleteFile(file.fileId)} className="p-1 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button></div></div>
                                            <div className="pointer-events-none"><p className="text-[10px] text-white truncate">{file.name}</p><p className="text-[9px] text-zinc-500">{formatFileSize(file.size)}</p></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {folders.length === 0 && fileItems.length === 0 && <div className="flex flex-col items-center justify-center py-20 border border-[#27272a] bg-[#0A0A0A] border-dashed"><ImageIcon size={48} className="text-zinc-800 mb-4" /><p className="text-zinc-500 font-medium">This folder is empty</p><button onClick={() => setShowCreateFolder(true)} className="mt-4 px-4 py-2 bg-zinc-800 text-zinc-300 text-sm">Create Folder</button></div>}
                </>
            )}

            {showCreateFolder && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h3 className="text-white font-bold mb-4">Create New Folder</h3>
                        <p className="text-zinc-500 text-sm mb-4">Creating in: <span className="text-zinc-300">{currentPath}</span></p>
                        <input type="text" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white text-sm mb-4" autoFocus />
                        <div className="flex gap-2 justify-end"><button onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">Cancel</button><button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolderMutation.isPending} className="px-4 py-2 bg-emerald-500 text-black font-bold text-sm disabled:opacity-50">{createFolderMutation.isPending ? 'Creating...' : 'Create'}</button></div>
                    </div>
                </div>
            )}

            {showMoveModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h3 className="text-white font-bold mb-4">Move {selectedFiles.length} Files</h3>
                        <p className="text-zinc-500 text-sm mb-4">Enter destination folder path (e.g., /products/new)</p>
                        <input type="text" placeholder="/destination/path" value={moveDestination} onChange={(e) => setMoveDestination(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white text-sm mb-4" autoFocus />
                        <div className="flex gap-2 justify-end"><button onClick={() => { setShowMoveModal(false); setMoveDestination(''); }} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">Cancel</button><button onClick={handleMoveFiles} disabled={!moveDestination.trim() || moveFileMutation.isPending} className="px-4 py-2 bg-blue-500 text-white font-bold text-sm disabled:opacity-50">{moveFileMutation.isPending ? 'Moving...' : 'Move'}</button></div>
                    </div>
                </div>
            )}

            {fileDetailsId && <FileDetailsModal fileId={fileDetailsId} onClose={() => setFileDetailsId(null)} />}
        </div>
    );
}

function FileDetailsModal({ fileId, onClose }: { fileId: string; onClose: () => void }) {
    const { data, isLoading } = useImageKitFiles({ path: '/', limit: 1000 });
    const file = data?.data?.find(f => f.fileId === fileId);

    if (isLoading) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><div className="bg-[#0A0A0A] border border-[#27272a] p-6"><p className="text-zinc-400">Loading...</p></div></div>;
    if (!file) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4"><h3 className="text-white font-bold">File Details</h3><button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button></div>
                {file.mime?.startsWith('image/') && <img src={file.url} alt={file.name} className="w-full max-h-64 object-contain bg-zinc-900 mb-4" />}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-zinc-800 pb-2"><span className="text-zinc-500">Name</span><span className="text-white truncate ml-4">{file.name}</span></div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2"><span className="text-zinc-500">Path</span><span className="text-white truncate ml-4">{file.filePath}</span></div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2"><span className="text-zinc-500">Size</span><span className="text-white">{file.size ? `${(file.size / 1024).toFixed(1)} KB` : '-'}</span></div>
                    {file.width && file.height && <div className="flex justify-between border-b border-zinc-800 pb-2"><span className="text-zinc-500">Dimensions</span><span className="text-white">{file.width} × {file.height}</span></div>}
                    <div className="flex justify-between border-b border-zinc-800 pb-2"><span className="text-zinc-500">Type</span><span className="text-white">{file.mime || '-'}</span></div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2"><span className="text-zinc-500">Created</span><span className="text-white">{new Date(file.createdAt).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">URL</span><a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate ml-4">Open</a></div>
                </div>
            </div>
        </div>
    );
}
