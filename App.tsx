import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listMediaFiles, uploadFile, deleteFile } from './services/firebase';
import { MediaFile } from './types';
import Header from './components/Header';
import MediaGrid from './components/MediaGrid';
import UploadProgress from './components/UploadProgress';
import BottomNav from './components/BottomNav';
import MediaDetail from './components/MediaDetail';
import Spinner from './components/Spinner';
import MasterKeyModal from './components/MasterKeyModal';
import ConfirmModal from './components/ConfirmModal';

const LAZY_RENDER_BATCH_SIZE = 6;

const App: React.FC = () => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for pagination
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    
    // State for lazy rendering
    const [renderedCount, setRenderedCount] = useState(LAZY_RENDER_BATCH_SIZE);

    // Admin state
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isMasterKeyModalOpen, setIsMasterKeyModalOpen] = useState<boolean>(false);

    // Delete confirmation state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    // Header visibility state
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);


    useEffect(() => {
        // A threshold to prevent jittery behavior on minor scroll movements.
        const SCROLL_THRESHOLD = 10; 

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY.current;

            // Always show header when at the top of the page.
            if (currentScrollY < SCROLL_THRESHOLD) {
                setIsHeaderVisible(true);
                lastScrollY.current = currentScrollY;
                return;
            }

            // Hide header when scrolling down past the threshold.
            if (scrollDelta > SCROLL_THRESHOLD) {
                setIsHeaderVisible(false);
            } 
            // Show header when scrolling up past the threshold.
            else if (scrollDelta < -SCROLL_THRESHOLD) {
                setIsHeaderVisible(true);
            }
            
            // Update the last scroll position for the next event.
            lastScrollY.current = currentScrollY;
        };


        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);


    const loadMoreMedia = useCallback(async () => {
        if (!nextPageToken) {
            setHasMore(false);
            return;
        };
        
        setIsLoadingMore(true);
        const { files, nextPageToken: token } = await listMediaFiles(nextPageToken);
        setMediaFiles(prev => [...prev, ...files]);
        setNextPageToken(token);
        if (!token) {
            setHasMore(false);
        }
        setIsLoadingMore(false);
    }, [nextPageToken]);

    // Observer for infinite scroll and lazy rendering
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                 // First, render more of the already-fetched items
                 if (renderedCount < mediaFiles.length) {
                    setRenderedCount(prev => Math.min(prev + LAZY_RENDER_BATCH_SIZE, mediaFiles.length));
                } 
                // If all fetched items are rendered, and there's more on the server, fetch the next page
                else if (hasMore) {
                    loadMoreMedia();
                }
            }
        });

        if (node) observer.current.observe(node);
    }, [isLoadingMore, hasMore, loadMoreMedia, mediaFiles.length, renderedCount]);


    const fetchInitialMedia = useCallback(async () => {
        setIsLoading(true);
        setHasMore(true); // Reset hasMore on initial fetch
        setRenderedCount(LAZY_RENDER_BATCH_SIZE); // Reset rendered count
        const { files, nextPageToken: token } = await listMediaFiles();
        setMediaFiles(files);
        setNextPageToken(token);
        if (!token) {
            setHasMore(false);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchInitialMedia();
    }, [fetchInitialMedia]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }

        setIsUploading(true);
        setUploadProgress({});
        
        const uploadPromises = Array.from(files).map((file: File) => {
            return uploadFile(file, (progress) => {
                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            });
        });

        try {
            await Promise.all(uploadPromises);
            await fetchInitialMedia();
        } catch (error) {
            alert('¡Ups! Algo ha fallado en la subida. ¿Quizás la foto es demasiado buena? Revisa la consola.');
            console.error(error);
        } finally {
            setIsUploading(false);
            setUploadProgress({});
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleMediaItemClick = (file: MediaFile) => {
        setSelectedMedia(file);
    };

    const handleGoBack = () => {
        setSelectedMedia(null);
    };

    const handleOpenMasterKeyModal = () => {
        setIsMasterKeyModalOpen(true);
    };

    const handleCloseMasterKeyModal = () => {
        setIsMasterKeyModalOpen(false);
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

    const handleCancelDelete = () => {
        setIsConfirmModalOpen(false);
        setFileToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        try {
            await deleteFile(fileToDelete);
            setMediaFiles(prev => prev.filter(file => file.name !== fileToDelete));
            if (selectedMedia?.name === fileToDelete) {
                setSelectedMedia(null);
            }
            alert('Archivo eliminado correctamente.');
        } catch (error) {
            console.error("Error deleting file:", error);
            alert('No se pudo eliminar el archivo.');
        } finally {
            handleCancelDelete();
        }
    };

    // FIX: Refactored the total progress calculation for clarity and to resolve a TypeScript error.
    // Breaking down the complex one-liner helps the type checker correctly infer the types.
    const progressValues = Object.values(uploadProgress);
    const totalProgress = progressValues.length > 0
        ? progressValues.reduce((acc, curr) => acc + curr, 0) / progressValues.length
        : 0;

    return (
        <div className="min-h-screen font-sans">
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
                    />
                    
                    <main className="container mx-auto">
                        {isUploading && <UploadProgress progress={totalProgress} />}
                        <MediaGrid 
                            mediaFiles={mediaFiles.slice(0, renderedCount)} 
                            isLoading={isLoading}
                            onItemClick={handleMediaItemClick}
                            lastElementRef={lastElementRef}
                            hasMore={renderedCount < mediaFiles.length || hasMore}
                        />
                        {isLoadingMore && (
                            <div className="flex justify-center items-center py-8">
                                <Spinner />
                            </div>
                        )}
                    </main>
                    
                    <BottomNav onUploadClick={handleUploadClick} />
                </div>
            )}


            <MasterKeyModal 
                isOpen={isMasterKeyModalOpen}
                onClose={handleCloseMasterKeyModal}
                onSubmit={handleMasterKeySubmit}
            />
            
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Confirmar eliminación"
                message={`¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.`}
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

export default App;