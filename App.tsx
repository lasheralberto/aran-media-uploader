import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listMediaFiles, uploadFile, deleteFile } from './services/firebase';
import { MediaFile } from './types';
import Header from './components/Header';
import MediaGrid from './components/MediaGrid';
import UploadProgress from './components/UploadProgress';
import BottomNav from './components/BottomNav';
import MediaModal from './components/MediaModal';
import Spinner from './components/Spinner';
import MasterKeyModal from './components/MasterKeyModal';
import ConfirmModal from './components/ConfirmModal';

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
    
    // Admin state
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isMasterKeyModalOpen, setIsMasterKeyModalOpen] = useState<boolean>(false);

    // Delete confirmation state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

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

    // Observer for infinite scroll
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


    const fetchInitialMedia = useCallback(async () => {
        setIsLoading(true);
        setHasMore(true); // Reset hasMore on initial fetch
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

    const handleCloseModal = () => {
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

    const totalProgress = Object.values(uploadProgress).length > 0
        ? Object.values(uploadProgress).reduce((acc: number, curr: number) => acc + curr, 0) / Object.values(uploadProgress).length
        : 0;

    return (
        <div className="min-h-screen font-sans pb-16">
            <Header postCount={mediaFiles.length} onOpenOptions={handleOpenMasterKeyModal} />
            
            <main className="container mx-auto">
                {isUploading && <UploadProgress progress={totalProgress} />}
                <MediaGrid 
                    mediaFiles={mediaFiles} 
                    isLoading={isLoading}
                    onItemClick={handleMediaItemClick}
                    lastElementRef={lastElementRef}
                    hasMore={hasMore}
                />
                {isLoadingMore && (
                    <div className="flex justify-center items-center py-8">
                        <Spinner />
                    </div>
                )}
            </main>
            
            <BottomNav onUploadClick={handleUploadClick} />

            <MediaModal 
                file={selectedMedia} 
                onClose={handleCloseModal} 
                isAdmin={isAdmin}
                onDelete={handleRequestDelete}
            />

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