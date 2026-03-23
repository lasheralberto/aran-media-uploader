import React, { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { countMediaFiles, listMediaFiles, deleteFileFromAllLocations, handleFileUploadProcess } from '../services/firebase';
import { MediaFile, UploadBatchState, UploadBatchSummary } from '../types';
import Header from './Header';
import MediaGrid from './MediaGrid';
import UploadProgress from './UploadProgress';
import { AddIcon, DownloadIcon, GridIcon, TrashIcon } from './Icons';
import MediaDetail from './MediaDetail';
import Spinner from './Spinner';
import ConfirmModal from './ConfirmModal';
import GalleryLoadStatus from './GalleryLoadStatus';
import FolderManager from './FolderManager';
import { createMediaFolder, listMediaFolders } from '../services/firebase';

const BACKGROUND_PRELOAD_CONCURRENCY = 2;
const BACKGROUND_PRELOAD_DELAY_MS = 250;
const ZIP_DOWNLOAD_CONCURRENCY = 4;
const ROOT_TAB_KEY = '__root__';
const DESTINATION_TAB_LABELS: Record<string, string> = {
    [ROOT_TAB_KEY]: 'Favs',
    'sin-retocar': 'Todas',
};

const getDestinationTabLabel = (folder: string | null): string => {
    if (folder === null) {
        return DESTINATION_TAB_LABELS[ROOT_TAB_KEY];
    }

    return DESTINATION_TAB_LABELS[folder] ?? folder;
};

const shouldSkipBackgroundPreload = (): boolean => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;

    if (!connection) {
        return false;
    }

    return connection.saveData === true || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
};

const preloadImageInBackground = (url: string): Promise<void> => (
    new Promise((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = url;
    })
);

const fetchOriginalMediaBlob = async (file: MediaFile): Promise<Blob> => {
    const response = await fetch(file.url);
    if (!response.ok) {
        throw new Error(`No se pudo descargar ${file.name}.`);
    }

    return response.blob();
};

const downloadBlobFile = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);

    try {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } finally {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
};

const buildBatchZipName = () => {
    const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
    return `imagenes-full-${timestamp}.zip`;
};

const buildPreloadStatusMap = (files: MediaFile[], skipBackgroundPreload: boolean): Record<string, boolean> => (
    files.reduce<Record<string, boolean>>((statusMap, file) => {
        statusMap[file.name] = file.type !== 'image' || skipBackgroundPreload;
        return statusMap;
    }, {})
);

const getGalleryImageSource = (file: MediaFile): string => file.previewUrl ?? file.url;


interface GalleryProps {
    userId: string;
    currentUserName: string;
    isAdmin: boolean;
    onSignOut: () => Promise<void> | void;
}

const Gallery: React.FC<GalleryProps> = ({ userId, currentUserName, isAdmin, onSignOut }) => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [totalMediaCount, setTotalMediaCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadState, setUploadState] = useState<UploadBatchState | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

    const [folders, setFolders] = useState<string[]>([]);
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
    const [isFolderManagerVisible, setIsFolderManagerVisible] = useState<boolean>(true);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [isMultipleDeleteModalOpen, setIsMultipleDeleteModalOpen] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const galleryScrollPositionRef = useRef<number | null>(null);
    const shouldRestoreScrollRef = useRef(false);

    const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
    const lastPreloadedMediaIndexRef = useRef(0);
    const [preloadStatusByFileName, setPreloadStatusByFileName] = useState<Record<string, boolean>>({});

    const markFileAsPreloaded = useCallback((fileName: string) => {
        setPreloadStatusByFileName(prev => {
            if (prev[fileName]) {
                return prev;
            }

            return {
                ...prev,
                [fileName]: true,
            };
        });
    }, []);

    const selectedMedia = selectedMediaIndex !== null ? mediaFiles[selectedMediaIndex] ?? null : null;
    const destinationTabs = [null, ...folders];

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

    const refreshTotalMediaCount = useCallback(async () => {
        const total = await countMediaFiles(userId, activeFolder);
        setTotalMediaCount(total);
    }, [activeFolder, userId]);

    const refreshFolders = useCallback(async () => {
        const nextFolders = await listMediaFolders(userId);
        setFolders(nextFolders);
    }, [userId]);

    const fetchMedia = useCallback(async (token?: string) => {
        const isInitialFetch = !token;
        const skipBackgroundPreload = shouldSkipBackgroundPreload();

        if (isInitialFetch) {
            setIsLoading(true);
            setMediaFiles([]);
            setHasMore(true);
            lastPreloadedMediaIndexRef.current = 0;
            setPreloadStatusByFileName({});
        } else {
            setIsLoadingMore(true);
        }

        const { files, nextPageToken: newToken } = await listMediaFiles(userId, activeFolder, token);

        setMediaFiles(prev => isInitialFetch ? files : [...prev, ...files]);
        setPreloadStatusByFileName(prev => {
            if (isInitialFetch) {
                return buildPreloadStatusMap(files, skipBackgroundPreload);
            }

            const nextStatus = { ...prev };
            files.forEach(file => {
                if (!(file.name in nextStatus)) {
                    nextStatus[file.name] = file.type !== 'image' || skipBackgroundPreload;
                }
            });
            return nextStatus;
        });
        setNextPageToken(newToken);
        if (!newToken) {
            setHasMore(false);
        }
        setIsLoading(false);
        setIsLoadingMore(false);
    }, [activeFolder, userId]);

    useEffect(() => {
        fetchMedia();
        refreshTotalMediaCount();
    }, [fetchMedia, refreshTotalMediaCount]);

    useEffect(() => {
        void refreshFolders();
    }, [refreshFolders]);

    useEffect(() => {
        if (mediaFiles.length === 0 || shouldSkipBackgroundPreload()) {
            return;
        }

        const preloadStartIndex = lastPreloadedMediaIndexRef.current;
        const preloadEndIndex = mediaFiles.length;

        if (preloadStartIndex >= preloadEndIndex) {
            return;
        }

        let isCancelled = false;

        const runPreloadQueue = async () => {
            let currentMediaIndex = preloadStartIndex;

            const workers = Array.from({ length: Math.min(BACKGROUND_PRELOAD_CONCURRENCY, preloadEndIndex - preloadStartIndex) }, async () => {
                while (!isCancelled && currentMediaIndex < preloadEndIndex) {
                    const nextIndex = currentMediaIndex;
                    currentMediaIndex += 1;

                    const nextFile = mediaFiles[nextIndex];

                    if (!nextFile) {
                        return;
                    }

                    if (nextFile.type === 'image') {
                        await preloadImageInBackground(getGalleryImageSource(nextFile));
                        if (!isCancelled) {
                            markFileAsPreloaded(nextFile.name);
                        }
                    }

                    lastPreloadedMediaIndexRef.current = Math.max(lastPreloadedMediaIndexRef.current, nextIndex + 1);
                }
            });

            await Promise.all(workers);
        };

        const timeoutId = window.setTimeout(() => {
            void runPreloadQueue();
        }, BACKGROUND_PRELOAD_DELAY_MS);

        return () => {
            isCancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [markFileAsPreloaded, mediaFiles]);

    useEffect(() => {
        if (!isSelectionModeActive || selectedItems.length > 0) {
            return;
        }

        setIsSelectionModeActive(false);
    }, [isSelectionModeActive, selectedItems]);

    useEffect(() => {
        if (selectedMediaIndex !== null || !shouldRestoreScrollRef.current) {
            return;
        }

        const scrollPosition = galleryScrollPositionRef.current;
        shouldRestoreScrollRef.current = false;

        if (scrollPosition === null) {
            return;
        }

        requestAnimationFrame(() => {
            window.scrollTo({ top: scrollPosition, behavior: 'auto' });
        });
    }, [selectedMediaIndex]);

    const loadMoreMedia = useCallback(() => {
        if (hasMore && !isLoadingMore && nextPageToken) {
            fetchMedia(nextPageToken);
        }
    }, [fetchMedia, hasMore, isLoadingMore, nextPageToken]);

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
            setUploadState,
            async (summary: UploadBatchSummary) => {
                await Promise.all([fetchMedia(), refreshTotalMediaCount()]);

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
            },
            activeFolder,
        );
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const toggleSelectedItem = useCallback((fileName: string) => {
        setSelectedItems(prev => {
            const nextItems = prev.includes(fileName)
                ? prev.filter(name => name !== fileName)
                : [...prev, fileName];

            setIsSelectionModeActive(nextItems.length > 0);
            return nextItems;
        });
    }, []);

    const handleLongPress = (file: MediaFile) => {
        toggleSelectedItem(file.name);
    };

    const handleMediaItemClick = (file: MediaFile) => {
        if (isSelectionModeActive) {
            toggleSelectedItem(file.name);
        } else {
            const mediaIndex = mediaFiles.findIndex(mediaFile => mediaFile.name === file.name);
            galleryScrollPositionRef.current = window.scrollY;
            setSelectedMediaIndex(mediaIndex >= 0 ? mediaIndex : null);
        }
    };

    const handleCancelSelection = () => {
        setIsSelectionModeActive(false);
        setSelectedItems([]);
    };

    const handleDownloadSelected = useCallback(async () => {
        if (selectedItems.length === 0 || isDownloading) {
            return;
        }

        const filesToDownload = mediaFiles.filter(file => selectedItems.includes(file.name));
        if (filesToDownload.length === 0) {
            return;
        }

        setIsDownloading(true);
        try {
            const zip = new JSZip();
            const downloadedFiles = new Array<{ name: string; blob: Blob }>(filesToDownload.length);
            let currentIndex = 0;

            const workers = Array.from(
                { length: Math.min(ZIP_DOWNLOAD_CONCURRENCY, filesToDownload.length) },
                async () => {
                    while (currentIndex < filesToDownload.length) {
                        const fileIndex = currentIndex;
                        currentIndex += 1;

                        const file = filesToDownload[fileIndex];
                        const blob = await fetchOriginalMediaBlob(file);
                        downloadedFiles[fileIndex] = {
                            name: file.name,
                            blob,
                        };
                    }
                }
            );

            await Promise.all(workers);

            downloadedFiles.forEach(file => {
                zip.file(file.name, file.blob);
            });

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
            });

            downloadBlobFile(zipBlob, buildBatchZipName());
            alert(`ZIP generado correctamente con ${filesToDownload.length} archivo${filesToDownload.length > 1 ? 's' : ''} en resolucion completa.`);
        } catch (error) {
            console.error('Error downloading files:', error);
            alert(`No se pudieron descargar algunos archivos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsDownloading(false);
        }
    }, [isDownloading, mediaFiles, selectedItems]);

    const handleGoBack = () => {
        shouldRestoreScrollRef.current = true;
        setSelectedMediaIndex(null);
    };

    const handleShowPreviousMedia = () => {
        setSelectedMediaIndex(prevIndex => {
            if (prevIndex === null || prevIndex <= 0) {
                return prevIndex;
            }

            return prevIndex - 1;
        });
    };

    const handleShowNextMedia = () => {
        setSelectedMediaIndex(prevIndex => {
            if (prevIndex === null || prevIndex >= mediaFiles.length - 1) {
                return prevIndex;
            }

            return prevIndex + 1;
        });
    };

    const handleRequestDelete = (fileName: string) => {
        if (!isAdmin) return;
        setFileToDelete(fileName);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!isAdmin) {
            setIsConfirmModalOpen(false);
            setFileToDelete(null);
            return;
        }

        if (!fileToDelete) return;
        try {
            await deleteFileFromAllLocations(fileToDelete, userId, activeFolder);
            setMediaFiles(prev => prev.filter(file => file.name !== fileToDelete));
            setTotalMediaCount(prev => Math.max(0, prev - 1));
            if (selectedMedia?.name === fileToDelete) {
                setSelectedMediaIndex(null);
            }
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
        if (!isAdmin) return;
        if (selectedItems.length === 0) return;
        setIsMultipleDeleteModalOpen(true);
    };

    const handleConfirmMultipleDelete = async () => {
        if (!isAdmin) {
            setIsMultipleDeleteModalOpen(false);
            handleCancelSelection();
            return;
        }

        if (selectedItems.length === 0) return;

        setIsDeleting(true);
        try {
            const deletePromises = selectedItems.map(fileName =>
                deleteFileFromAllLocations(fileName, userId, activeFolder)
            );
            await Promise.all(deletePromises);
            setMediaFiles(prev => prev.filter(file => !selectedItems.includes(file.name)));
            setTotalMediaCount(prev => Math.max(0, prev - selectedItems.length));
            if (selectedMedia && selectedItems.includes(selectedMedia.name)) {
                setSelectedMediaIndex(null);
            }
            setIsSelectionModeActive(false);
            setSelectedItems([]);
            alert(`${selectedItems.length} archivo(s) eliminado(s) correctamente de todas las ubicaciones.`);
        } catch (error) {
            console.error('Error deleting files:', error);
            alert(`No se pudieron eliminar algunos archivos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsDeleting(false);
            setIsMultipleDeleteModalOpen(false);
        }
    };

    const handleCreateFolder = useCallback(async (folderName: string) => {
        setIsCreatingFolder(true);

        try {
            const createdFolder = await createMediaFolder(userId, folderName);
            await refreshFolders();
            setActiveFolder(createdFolder);
            alert(`Carpeta ${createdFolder} creada correctamente.`);
        } catch (error) {
            console.error('Error creating folder:', error);
            alert(error instanceof Error ? error.message : 'No se pudo crear la carpeta.');
        } finally {
            setIsCreatingFolder(false);
        }
    }, [refreshFolders, userId]);

    return (
        <div className="min-h-screen bg-white text-neutral-950">
            {selectedMedia ? (
                <MediaDetail
                    file={selectedMedia}
                    onBack={handleGoBack}
                    isAdmin={isAdmin}
                    onDelete={handleRequestDelete}
                    onPrevious={handleShowPreviousMedia}
                    onNext={handleShowNextMedia}
                    hasPrevious={selectedMediaIndex > 0}
                    hasNext={selectedMediaIndex < mediaFiles.length - 1}
                    currentIndex={selectedMediaIndex}
                    totalItems={mediaFiles.length}
                />
            ) : (
                <div className="pb-24 md:pb-16">
                    <Header
                        postCount={totalMediaCount}
                        isVisible={isHeaderVisible}
                        userId={userId}
                        currentUserName={currentUserName}
                        onSignOut={onSignOut}
                        isSelectionModeActive={isSelectionModeActive}
                        selectedItemsCount={selectedItems.length}
                        onCancelSelection={handleCancelSelection}
                        isAdmin={isAdmin}
                        isFolderManagerVisible={isFolderManagerVisible}
                        onToggleFolderManager={() => setIsFolderManagerVisible(previous => !previous)}
                    />

                    <main className="mx-auto max-w-[935px] px-0 md:px-4 md:pt-6">
                        {isUploading && uploadState && <UploadProgress state={uploadState} />}

                        {!isSelectionModeActive && destinationTabs.length > 0 && (
                            <div className="mb-4 border-y border-neutral-200 bg-white md:mb-6 md:rounded-t-[18px] md:border md:border-b-0">
                                <div className="flex items-stretch overflow-x-auto px-2 md:px-4">
                                    {destinationTabs.map((folder) => {
                                        const isActive = activeFolder === folder;
                                        const label = getDestinationTabLabel(folder);

                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => setActiveFolder(folder)}
                                                className={`group relative inline-flex min-w-[110px] flex-1 shrink-0 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition md:min-w-[140px] md:flex-none ${isActive ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'}`}
                                                aria-pressed={isActive}
                                            >
                                                <GridIcon className={`h-4 w-4 transition ${isActive ? 'text-neutral-950' : 'text-neutral-300 group-hover:text-neutral-500'}`} />
                                                <span className="truncate">{label}</span>
                                                <span className={`absolute inset-x-3 bottom-0 h-[2px] rounded-full transition ${isActive ? 'bg-neutral-950' : 'bg-transparent group-hover:bg-neutral-300'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {isAdmin && !isSelectionModeActive && isFolderManagerVisible && (
                            <div className="px-4 md:px-0">
                                <FolderManager
                                    isCreating={isCreatingFolder}
                                    onCreateFolder={handleCreateFolder}
                                    onClose={() => setIsFolderManagerVisible(false)}
                                />
                            </div>
                        )}

                        {isSelectionModeActive && (
                            <div className="sticky top-[72px] z-20 border-y border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:top-[88px] md:mb-4 md:rounded-2xl md:border md:px-5">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Seleccion</p>
                                        <p className="text-sm font-semibold text-neutral-900">{selectedItems.length} recuerdo{selectedItems.length > 1 ? 's' : ''} seleccionado{selectedItems.length > 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="text-xs text-neutral-500">Manten pulsado o toca para ajustar la seleccion</div>
                                </div>

                                {isAdmin && selectedItems.length > 0 && (
                                    <div className="flex justify-center md:justify-end">
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
                            preloadStatusByFileName={preloadStatusByFileName}
                            onImageReady={markFileAsPreloaded}
                        />

                        {isLoadingMore && (
                            <div className="flex items-center justify-center py-8">
                                <Spinner />
                            </div>
                        )}
                    </main>
                </div>
            )}

            {!selectedMedia && !isSelectionModeActive && isAdmin && (
                <>
                    <GalleryLoadStatus
                        loadedCount={mediaFiles.length}
                        totalCount={totalMediaCount}
                        isLoadingMore={isLoadingMore}
                        hasMore={hasMore}
                        onLoadMore={loadMoreMedia}
                    />
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
                </>
            )}

            {!selectedMedia && isSelectionModeActive && selectedItems.length > 0 && (
                <div className="pointer-events-none fixed bottom-5 left-5 z-30 md:bottom-8 md:left-8">
                    <button
                        onClick={handleDownloadSelected}
                        disabled={isDownloading}
                        className="pointer-events-auto inline-flex min-h-14 items-center gap-3 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(17,17,17,0.18)] transition hover:scale-[1.02] hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 md:min-h-16 md:rounded-full md:px-6"
                        aria-label={isDownloading ? 'Descarga en progreso' : `Descargar ${selectedItems.length} archivo${selectedItems.length > 1 ? 's' : ''}`}
                    >
                        {isDownloading ? (
                            <Spinner />
                        ) : (
                            <DownloadIcon className="h-5 w-5" />
                        )}
                        <span>
                            {isDownloading
                                ? 'Generando ZIP...'
                                : `Descargar ZIP (${selectedItems.length})`}
                        </span>
                    </button>
                </div>
            )}

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
