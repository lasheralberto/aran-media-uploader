
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listMediaFiles, deleteFile, deleteFileFromAllLocations, copyFileToCategory, checkCategoryContent, handleFileUploadProcess } from '../services/firebase';
import { MediaFile } from '../types';
import Header from './Header';
import MediaGrid from './MediaGrid';
import UploadProgress from './UploadProgress';
import { AddIcon, ChurchIcon, CelebrationIcon, PartyIcon, TrashIcon } from './Icons';
import MediaDetail from './MediaDetail';
import Spinner from './Spinner';
import MasterKeyModal from './MasterKeyModal';
import ConfirmModal from './ConfirmModal';
import StoryViewer from './StoryViewer';


interface GalleryProps {
    userId: string;
}

type Category = 'Church' | 'Celebration' | 'Party';
const CATEGORIES: { id: Category; label: string }[] = [
    { id: 'Church', label: 'Iglesia' },
    { id: 'Celebration', label: 'Celebración' },
    { id: 'Party', label: 'Fiesta' },
];

const Gallery: React.FC<GalleryProps> = ({ userId }) => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination state
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    
    // Admin state
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isMasterKeyModalOpen, setIsMasterKeyModalOpen] = useState<boolean>(false);

    // Delete confirmation state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [isMultipleDeleteModalOpen, setIsMultipleDeleteModalOpen] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Header visibility state
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    
    // Selection mode state
    const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isCopying, setIsCopying] = useState<boolean>(false);

    // Category and Story state
    const [categoriesWithContent, setCategoriesWithContent] = useState<Category[]>([]);
    const [storyViewerState, setStoryViewerState] = useState<{ media: MediaFile[] } | null>(null);


    const refreshCategoryContentCheck = useCallback(async () => {
        const checks = CATEGORIES.map(async (cat) => {
            const hasContent = await checkCategoryContent(userId, cat.id);
            return hasContent ? cat.id : null;
        });
        const results = (await Promise.all(checks)).filter(Boolean) as Category[];
        setCategoriesWithContent(results);
    }, [userId]);

    useEffect(() => {
        const SCROLL_THRESHOLD = 10; 
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY.current;
            if (currentScrollY < SCROLL_THRESHOLD) {
                setIsHeaderVisible(true);
            } else if (scrollDelta > SCROLL_THRESHOLD) {
                setIsHeaderVisible(false);
            } else if (scrollDelta < -SCROLL_THRESHOLD) {
                setIsHeaderVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchMedia = useCallback(async (token?: string) => {
        const isInitialFetch = !token;

        if (isInitialFetch) {
            setIsLoading(true);
            setMediaFiles([]);
            setHasMore(true);
        } else {
            setIsLoadingMore(true);
        }

        const { files, nextPageToken: newToken } = await listMediaFiles(userId, null, token);
        
        setMediaFiles(prev => isInitialFetch ? files : [...prev, ...files]);
        setNextPageToken(newToken);
        if (!newToken) {
            setHasMore(false);
        }
        setIsLoading(false);
        setIsLoadingMore(false);

    }, [userId]);

    useEffect(() => {
        fetchMedia();
        refreshCategoryContentCheck();
    }, [fetchMedia, refreshCategoryContentCheck]);


    const loadMoreMedia = () => {
        if (hasMore && !isLoadingMore && nextPageToken) {
            fetchMedia(nextPageToken);
        }
    };

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMoreMedia();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoadingMore, hasMore, loadMoreMedia]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        await handleFileUploadProcess(
            files,
            userId,
            setIsUploading,
            setUploadProgress,
            async () => {
                await fetchMedia(); // On success: always refresh main view
            },
            (error) => {
                alert('¡Ups! Algo ha fallado en la subida. ¿Quizás la foto es demasiado buena? Revisa la consola.');
                console.error(error);
            },
            () => {
                refreshCategoryContentCheck();
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        );
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleLongPress = (file: MediaFile) => {
        setIsSelectionModeActive(true);
        setSelectedItems([file.name]);
    };

    const handleMediaItemClick = (file: MediaFile) => {
        if (isSelectionModeActive) {
            setSelectedItems(prev =>
                prev.includes(file.name)
                    ? prev.filter(name => name !== file.name)
                    : [...prev, file.name]
            );
        } else {
            setSelectedMedia(file);
        }
    };

    const handleAddToCategory = async (category: Category) => {
        if (!isSelectionModeActive || selectedItems.length === 0 || isCopying) return;
        
        setIsCopying(true);
        try {
            const copyPromises = selectedItems.map(fileName =>
                copyFileToCategory(fileName, userId, category)
            );
            await Promise.all(copyPromises);
            alert(`${selectedItems.length} archivo(s) añadido(s) a '${CATEGORIES.find(c => c.id === category)?.label}' con éxito.`);
        } catch (error) {
            console.error("Error copying files:", error);
            alert('Hubo un error al añadir los archivos a la categoría.');
        } finally {
            setIsCopying(false);
            setIsSelectionModeActive(false);
            setSelectedItems([]);
            refreshCategoryContentCheck();
        }
    };

    const handleStoryBubbleClick = async (categoryId: string) => {
        // Use a temporary loading state if needed, e.g., on the bubble itself
        try {
            // Fetch all media for the story (up to 1000 items)
            const { files } = await listMediaFiles(userId, categoryId, undefined, 1000);
            if (files.length > 0) {
                setStoryViewerState({ media: files });
            } else {
                alert("Esta categoría aún no tiene recuerdos.");
            }
        } catch (error) {
            console.error("Failed to load story media:", error);
            alert("No se pudieron cargar las historias.");
        }
    };

    const handleCancelSelection = () => {
        setIsSelectionModeActive(false);
        setSelectedItems([]);
    };
    
    const handleGoBack = () => {
        setSelectedMedia(null);
    };

    const handleOpenMasterKeyModal = () => {
        setIsMasterKeyModalOpen(true);
    };

    const handleMasterKeySubmit = (key: string) => {
        if (key === 'bodorrio') {
            setIsAdmin(true);
            setIsMasterKeyModalOpen(false);
            alert('Modo administrador activado.');
        } else {
            alert('Clave incorrecta.');
        }
    };

    const handleRequestDelete = (fileName: string) => {
        setFileToDelete(fileName);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        try {
            console.log(`🔍 Starting deletion process for: ${fileToDelete} (user: ${userId})`);
            await deleteFileFromAllLocations(fileToDelete, userId);
            
            setMediaFiles(prev => prev.filter(file => file.name !== fileToDelete));
            if (selectedMedia?.name === fileToDelete) {
                setSelectedMedia(null);
            }
            refreshCategoryContentCheck();
            alert('Archivo eliminado correctamente de todas las ubicaciones.');
        } catch (error) {
            console.error("Error deleting file:", error);
            alert(`No se pudo eliminar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsConfirmModalOpen(false);
            setFileToDelete(null);
        }
    };

    const handleRequestMultipleDelete = () => {
        if (selectedItems.length === 0) return;
        setIsMultipleDeleteModalOpen(true);
    };

    const handleConfirmMultipleDelete = async () => {
        if (selectedItems.length === 0) return;
        
        setIsDeleting(true);
        try {
            console.log(`🔍 Starting multiple deletion for ${selectedItems.length} files (user: ${userId})`);
            console.log(`Files to delete:`, selectedItems);
            
            // Delete all selected files from all locations
            const deletePromises = selectedItems.map(fileName => 
                deleteFileFromAllLocations(fileName, userId)
            );
            await Promise.all(deletePromises);
            
            // Update state
            setMediaFiles(prev => prev.filter(file => !selectedItems.includes(file.name)));
            
            // If the currently selected media is being deleted, close the detail view
            if (selectedMedia && selectedItems.includes(selectedMedia.name)) {
                setSelectedMedia(null);
            }
            
            // Exit selection mode
            setIsSelectionModeActive(false);
            setSelectedItems([]);
            
            refreshCategoryContentCheck();
            alert(`${selectedItems.length} archivo(s) eliminado(s) correctamente de todas las ubicaciones.`);
        } catch (error) {
            console.error("Error deleting files:", error);
            alert(`No se pudieron eliminar algunos archivos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsDeleting(false);
            setIsMultipleDeleteModalOpen(false);
        }
    };

    // FIX: Simplified calculation to avoid TypeScript arithmetic errors.
    const progressValues = Object.values(uploadProgress) as number[];
    const totalProgress = progressValues.length > 0
        ? progressValues.reduce((acc, curr) => acc + curr, 0) / progressValues.length
        : 0;

    return (
        <div className="min-h-screen font-sans">
            {storyViewerState && (
                <StoryViewer
                    media={storyViewerState.media}
                    onClose={() => setStoryViewerState(null)}
                />
            )}

            {selectedMedia ? (
                <MediaDetail 
                    file={selectedMedia}
                    onBack={handleGoBack}
                    isAdmin={isAdmin}
                    onDelete={handleRequestDelete}
                />
            ) : (
                <div className="pb-24">
                    <Header 
                        postCount={mediaFiles.length} 
                        onOpenOptions={handleOpenMasterKeyModal} 
                        isVisible={isHeaderVisible}
                        userId={userId}
                        isSelectionModeActive={isSelectionModeActive}
                        selectedItemsCount={selectedItems.length}
                        onCancelSelection={handleCancelSelection}
                        categoriesWithContent={CATEGORIES.filter(c => categoriesWithContent.includes(c.id))}
                        onCategoryBubbleClick={handleStoryBubbleClick}
                    />
                    
                    <main className="container mx-auto">
                         {isUploading && <UploadProgress progress={totalProgress} />}

                        {isSelectionModeActive && (
                             <div className="p-4">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {CATEGORIES.map(category => (
                                        <button 
                                            key={category.id}
                                            onClick={() => handleAddToCategory(category.id)}
                                            disabled={isCopying}
                                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-rose-300 transition-all text-center disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            <div className="p-3 bg-rose-100 rounded-full">
                                                {category.id === 'Church' ? <ChurchIcon className="h-6 w-6 text-rose-500" /> : category.id === 'Celebration' ? <CelebrationIcon className="h-6 w-6 text-rose-500"/> : <PartyIcon className="h-6 w-6 text-rose-500"/>}
                                            </div>
                                            <span className="font-semibold text-gray-700 text-sm">{category.label}</span>
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Botón de eliminación múltiple solo para administradores */}
                                {isAdmin && selectedItems.length > 0 && (
                                    <div className="flex justify-center">
                                        <button 
                                            onClick={handleRequestMultipleDelete}
                                            disabled={isDeleting}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isDeleting ? (
                                                <Spinner />
                                            ) : (
                                                <TrashIcon className="h-5 w-5" />
                                            )}
                                            <span className="font-semibold">
                                                {isDeleting 
                                                    ? 'Eliminando...' 
                                                    : `Eliminar ${selectedItems.length} archivo${selectedItems.length > 1 ? 's' : ''}`
                                                }
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <MediaGrid 
                            mediaFiles={mediaFiles} 
                            isLoading={isLoading}
                            onItemClick={handleMediaItemClick}
                            lastElementRef={lastElementRef}
                            hasMore={hasMore}
                            selectionMode={isSelectionModeActive}
                            selectedItems={selectedItems}
                            onLongPress={handleLongPress}
                        />
                        {isLoadingMore && (
                            <div className="flex justify-center items-center py-8">
                                <Spinner />
                            </div>
                        )}
                    </main>
                </div>
            )}

            {!selectedMedia && !isSelectionModeActive && !storyViewerState &&(
                 <div className="fixed bottom-6 right-6 z-20">
                     <button
                        onClick={handleUploadClick}
                        className="bg-rose-500 text-white rounded-full p-4 shadow-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-transform transform hover:scale-110"
                        aria-label="Subir archivos"
                    >
                        <AddIcon className="h-8 w-8" />
                    </button>
                </div>
            )}

            <MasterKeyModal 
                isOpen={isMasterKeyModalOpen}
                onClose={() => setIsMasterKeyModalOpen(false)}
                onSubmit={handleMasterKeySubmit}
            />
            
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar eliminación"
                message={`¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.`}
            />

            <ConfirmModal
                isOpen={isMultipleDeleteModalOpen}
                onClose={() => setIsMultipleDeleteModalOpen(false)}
                onConfirm={handleConfirmMultipleDelete}
                title="Confirmar eliminación múltiple"
                message={`¿Estás seguro de que quieres eliminar ${selectedItems.length} archivo${selectedItems.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
            />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
                className="hidden"
            />
        </div>
    );
};

export default Gallery;
