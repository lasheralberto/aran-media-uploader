import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listMediaFiles, deleteFileFromAllLocations, copyFileToCategory, checkCategoryContent, handleFileUploadProcess } from '../services/firebase';
import { MediaFile, UploadBatchState, UploadBatchSummary } from '../types';
import Header from './Header';
import MediaGrid from './MediaGrid';
import UploadProgress from './UploadProgress';
import { AddIcon, ChurchIcon, CelebrationIcon, PartyIcon, TrashIcon } from './Icons';
import MediaDetail from './MediaDetail';
import Spinner from './Spinner';
import MasterKeyModal from './MasterKeyModal';
import ConfirmModal from './ConfirmModal';


interface GalleryProps {
    userId: string;
}

type Category = 'Church' | 'Celebration' | 'Party';
const CATEGORIES: { id: Category; label: string }[] = [
    { id: 'Church', label: 'Iglesia' },
    { id: 'Celebration', label: 'Celebracion' },
    { id: 'Party', label: 'Fiesta' },
];

const Gallery: React.FC<GalleryProps> = ({ userId }) => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadState, setUploadState] = useState<UploadBatchState | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isMasterKeyModalOpen, setIsMasterKeyModalOpen] = useState<boolean>(false);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [isMultipleDeleteModalOpen, setIsMultipleDeleteModalOpen] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isCopying, setIsCopying] = useState<boolean>(false);

    const [categoriesWithContent, setCategoriesWithContent] = useState<Category[]>([]);

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
    }, [isLoadingMore, hasMore]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        await handleFileUploadProcess(
            files,
            userId,
            setIsUploading,
            setUploadState,
            async (summary: UploadBatchSummary) => {
                await fetchMedia();
                await refreshCategoryContentCheck();

                if (summary.failedFiles > 0) {
                    alert(`Subida completada con incidencias: ${summary.successfulFiles} ok, ${summary.failedFiles} fallidos.`);
                    return;
                }

                alert(`${summary.successfulFiles} archivo(s) subido(s) correctamente.`);
            },
            (error) => {
                alert('Algo ha fallado en la subida. Revisa la consola.');
                console.error(error);
            },
            () => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
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
            await refreshCategoryContentCheck();
            alert(`${selectedItems.length} archivo(s) anadido(s) a '${CATEGORIES.find(c => c.id === category)?.label}' con exito.`);
        } catch (error) {
            console.error('Error copying files:', error);
            alert('Hubo un error al anadir los archivos a la categoria.');
        } finally {
            setIsCopying(false);
            setIsSelectionModeActive(false);
            setSelectedItems([]);
        }
    };

    const handleStoryBubbleClick = async (categoryId: string) => {
        try {
            const { files } = await listMediaFiles(userId, categoryId, undefined, 1000);
            if (files.length > 0) {
                alert(`La historia de ${categoryId} no esta disponible en esta vista.`);
            } else {
                alert('Esta categoria aun no tiene recuerdos.');
            }
        } catch (error) {
            console.error('Failed to load story media:', error);
            alert('No se pudieron cargar las historias.');
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
            await deleteFileFromAllLocations(fileToDelete, userId);
            setMediaFiles(prev => prev.filter(file => file.name !== fileToDelete));
            if (selectedMedia?.name === fileToDelete) {
                setSelectedMedia(null);
            }
            await refreshCategoryContentCheck();
            alert('Archivo eliminado correctamente de todas las ubicaciones.');
        } catch (error) {
            console.error('Error deleting file:', error);
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
            const deletePromises = selectedItems.map(fileName =>
                deleteFileFromAllLocations(fileName, userId)
            );
            await Promise.all(deletePromises);
            setMediaFiles(prev => prev.filter(file => !selectedItems.includes(file.name)));
            if (selectedMedia && selectedItems.includes(selectedMedia.name)) {
                setSelectedMedia(null);
            }
            setIsSelectionModeActive(false);
            setSelectedItems([]);
            await refreshCategoryContentCheck();
            alert(`${selectedItems.length} archivo(s) eliminado(s) correctamente de todas las ubicaciones.`);
        } catch (error) {
            console.error('Error deleting files:', error);
            alert(`No se pudieron eliminar algunos archivos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsDeleting(false);
            setIsMultipleDeleteModalOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-neutral-950">
            {selectedMedia ? (
                <MediaDetail
                    file={selectedMedia}
                    onBack={handleGoBack}
                    isAdmin={isAdmin}
                    onDelete={handleRequestDelete}
                />
            ) : (
                <div className="pb-24 md:pb-16">
                    <Header
                        postCount={mediaFiles.length}
                        onOpenOptions={handleOpenMasterKeyModal}
                        isVisible={isHeaderVisible}
                        userId={userId}
                        isSelectionModeActive={isSelectionModeActive}
                        selectedItemsCount={selectedItems.length}
                        onCancelSelection={handleCancelSelection}
                    />

                    <main className="mx-auto max-w-[935px] px-0 md:px-4 md:pt-6">
                        {isUploading && uploadState && <UploadProgress state={uploadState} />}

                        {isSelectionModeActive && (
                            <div className="sticky top-[72px] z-20 border-y border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:top-[88px] md:mb-4 md:rounded-2xl md:border md:px-5">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Seleccion</p>
                                        <p className="text-sm font-semibold text-neutral-900">Guardar {selectedItems.length} recuerdo{selectedItems.length > 1 ? 's' : ''} en highlights</p>
                                    </div>
                                    <div className="text-xs text-neutral-500">Manten pulsado para seguir seleccionando</div>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5 md:gap-3">
                                    {CATEGORIES.map(category => (
                                        <button
                                            key={category.id}
                                            onClick={() => handleAddToCategory(category.id)}
                                            disabled={isCopying}
                                            className="flex min-h-0 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-left transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50"
                                        >
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 p-[1px]">
                                                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-neutral-900">
                                                    {category.id === 'Church' ? <ChurchIcon className="h-5 w-5" /> : category.id === 'Celebration' ? <CelebrationIcon className="h-5 w-5" /> : <PartyIcon className="h-5 w-5" />}
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block truncate text-sm font-semibold text-neutral-900">{category.label}</span>
                                                <span className="block text-xs text-neutral-500">Anadir a historia destacada</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {isAdmin && selectedItems.length > 0 && (
                                    <div className="mt-3 flex justify-center md:justify-end">
                                        <button
                                            onClick={handleRequestMultipleDelete}
                                            disabled={isDeleting}
                                            className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                                        >
                                            {isDeleting ? (
                                                <Spinner />
                                            ) : (
                                                <TrashIcon className="h-5 w-5" />
                                            )}
                                            <span className="font-semibold">
                                                {isDeleting
                                                    ? 'Eliminando...'
                                                    : `Eliminar ${selectedItems.length} archivo${selectedItems.length > 1 ? 's' : ''}`}
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
                            <div className="flex items-center justify-center py-8">
                                <Spinner />
                            </div>
                        )}
                    </main>
                </div>
            )}

            {!selectedMedia && !isSelectionModeActive && (
                <div className="fixed bottom-5 right-5 z-20 md:bottom-8 md:right-8">
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-[0_12px_30px_rgba(17,17,17,0.18)] transition hover:scale-[1.03] hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 md:h-16 md:w-16 md:rounded-full"
                        aria-label={isUploading ? 'Subida en progreso' : 'Subir archivos'}
                    >
                        <AddIcon className="h-8 w-8 md:h-9 md:w-9" />
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
                title="Confirmar eliminacion"
                message="Estas seguro de que quieres eliminar este archivo? Esta accion no se puede deshacer."
            />

            <ConfirmModal
                isOpen={isMultipleDeleteModalOpen}
                onClose={() => setIsMultipleDeleteModalOpen(false)}
                onConfirm={handleConfirmMultipleDelete}
                title="Confirmar eliminacion multiple"
                message={`Estas seguro de que quieres eliminar ${selectedItems.length} archivo${selectedItems.length > 1 ? 's' : ''}? Esta accion no se puede deshacer.`}
            />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                disabled={isUploading}
                accept="image/*,video/*"
                className="hidden"
            />
        </div>
    );
};

export default Gallery;
