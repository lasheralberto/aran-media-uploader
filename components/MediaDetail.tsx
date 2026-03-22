
import React, { useEffect, useState } from 'react';
import { MediaFile } from '../types';
import { BackIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, CommentIcon, ShareIcon, DownloadIcon, CheckIcon, TrashIcon } from './Icons';
import Spinner from './Spinner';

interface MediaDetailProps {
    file: MediaFile;
    onBack: () => void;
    isAdmin: boolean;
    onDelete: (fileName: string) => void;
    onPrevious: () => void;
    onNext: () => void;
    hasPrevious: boolean;
    hasNext: boolean;
    currentIndex: number;
    totalItems: number;
}

const MediaDetail: React.FC<MediaDetailProps> = ({ file, onBack, isAdmin, onDelete, onPrevious, onNext, hasPrevious, hasNext, currentIndex, totalItems }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isFullResolutionLoaded, setIsFullResolutionLoaded] = useState(false);

    useEffect(() => {
        setIsFullResolutionLoaded(false);
    }, [file.url]);

    const handleDelete = () => {
        onDelete(file.name);
    };

    // Helper function to fetch the blob, relying on the Service Worker for caching.
    const getMediaBlob = async (): Promise<Blob | null> => {
        try {
            const response = await fetch(file.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            return await response.blob();
        } catch (error) {
            console.error("Error fetching media blob:", error);
            alert("No se pudo obtener el archivo. Por favor, revisa tu conexión.");
            return null;
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const blob = await getMediaBlob();
        if (blob) {
            try {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } catch (error) {
                console.error("Error downloading file:", error);
                alert("No se pudo descargar el archivo.");
            }
        }
        setIsDownloading(false);
    };
    
    const handleShare = async () => {
        setIsSharing(true);
        const blob = await getMediaBlob();

        if (!blob) {
            setIsSharing(false);
            return;
        }
        
        const fileToShare = new File([blob], file.name, { type: blob.type });
        const shareData = {
            title: `Recuerdo de la boda: ${file.name}`,
            text: '¡Mira esta foto de la boda de Alberto y Mariona!',
            files: [fileToShare]
        };

        try {
             if (navigator.share && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
                await navigator.share(shareData);
            } else if (navigator.share) {
                // Fallback for devices that can't share files but can share URLs
                await navigator.share({
                    title: shareData.title,
                    text: shareData.text,
                    url: file.url
                });
            } else {
                 throw new Error('Web Share API not supported.');
            }
        } catch (e) {
            console.warn("Share failed, falling back to clipboard.", e);
            try {
                await navigator.clipboard.writeText(file.url);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (error) {
                console.error('Failed to copy URL:', error);
                alert('No se pudo copiar el enlace.');
            }
        }
        
        setIsSharing(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm animate-fade-in">
            <button 
                onClick={onBack} 
                className="absolute left-4 top-4 z-30 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                aria-label="Volver a la galería"
            >
                <BackIcon className="h-6 w-6"/>
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-16 md:top-5">
                <div className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur-md">
                    {currentIndex + 1} / {totalItems}
                </div>
            </div>

            <div className="flex h-full w-full items-center justify-center p-0 md:p-6">
                <div className="flex h-full w-full max-w-[1180px] overflow-hidden bg-white md:h-auto md:max-h-[88vh] md:rounded-[28px] md:shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                    <div className="relative flex min-h-[58vh] flex-1 items-center justify-center bg-neutral-950 md:min-h-[720px]">
                        <button
                            onClick={onPrevious}
                            disabled={!hasPrevious}
                            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-35 md:left-5 md:h-12 md:w-12"
                            aria-label="Imagen anterior"
                        >
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>

                        <button
                            onClick={onNext}
                            disabled={!hasNext}
                            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-35 md:right-5 md:h-12 md:w-12"
                            aria-label="Imagen siguiente"
                        >
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>

                        {file.type === 'image' ? (
                            <>
                                {file.previewUrl && file.previewUrl !== file.url && !isFullResolutionLoaded && (
                                    <img
                                        src={file.previewUrl}
                                        alt={file.name}
                                        className="absolute inset-0 h-full w-full object-contain blur-xl scale-105 opacity-70"
                                        aria-hidden="true"
                                    />
                                )}
                                {!isFullResolutionLoaded && (
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                                        <div className="rounded-full border border-white/15 bg-black/45 px-4 py-2 text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-md">
                                            <div className="flex items-center gap-3">
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-300 opacity-75"></span>
                                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-200"></span>
                                                </span>
                                                <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/80">Cargando</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <img 
                                    src={file.url} 
                                    alt={file.name} 
                                    className={`max-h-full w-full object-contain transition-opacity duration-300 ${isFullResolutionLoaded ? 'opacity-100' : 'opacity-0'}`}
                                    fetchPriority="high"
                                    decoding="async"
                                    onLoad={() => setIsFullResolutionLoaded(true)}
                                />
                            </>
                        ) : (
                            <video src={file.url} className="max-h-full w-full object-contain" controls autoPlay></video>
                        )}

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent md:hidden" />
                    </div>

                    <div className="absolute inset-x-0 bottom-0 border-t border-black/10 bg-white md:static md:flex md:w-[380px] md:flex-col md:border-l md:border-t-0">
                        <div className="hidden items-center gap-3 border-b border-neutral-200 px-5 py-4 md:flex">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-600 via-rose-500 to-amber-400 p-[2px]">
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold text-neutral-900">AM</div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-neutral-900">thebodorriogallery</p>
                                <p className="truncate text-xs text-neutral-500">Boda de Alberto y Mariona</p>
                            </div>
                        </div>

                        <div className="hidden flex-1 px-5 py-5 md:block">
                            <p className="text-sm font-semibold text-neutral-900">{file.name}</p>
                            <p className="mt-2 text-sm leading-6 text-neutral-600">Recuerdo compartido en la galería colaborativa de la boda. Puedes descargarlo o compartirlo directamente desde aquí.</p>
                        </div>

                        <div className="border-t border-neutral-200 bg-white/98 px-4 py-3 backdrop-blur md:border-t md:px-5 md:py-4">
                            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-600 md:hidden">
                                <button
                                    onClick={onPrevious}
                                    disabled={!hasPrevious}
                                    className="flex items-center gap-1 rounded-full px-2 py-1 text-neutral-800 transition hover:bg-white disabled:opacity-35"
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                    <span>Anterior</span>
                                </button>
                                <span>{currentIndex + 1} de {totalItems}</span>
                                <button
                                    onClick={onNext}
                                    disabled={!hasNext}
                                    className="flex items-center gap-1 rounded-full px-2 py-1 text-neutral-800 transition hover:bg-white disabled:opacity-35"
                                >
                                    <span>Siguiente</span>
                                    <ChevronRightIcon className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 text-neutral-900">
                                <button className="transition hover:text-rose-500" aria-label="Me gusta">
                                    <HeartIcon className="h-6 w-6" />
                                </button>
                                <button className="transition hover:text-neutral-500" aria-label="Comentarios">
                                    <CommentIcon className="h-6 w-6" />
                                </button>
                                <button 
                                    onClick={handleShare} 
                                    disabled={isSharing}
                                    className="transition hover:text-neutral-500 disabled:opacity-50"
                                    aria-label="Compartir archivo"
                                >
                                    {isCopied ? <CheckIcon className="h-6 w-6 text-emerald-500"/> : <ShareIcon className="h-6 w-6" />}
                                </button>
                                <div className="flex-grow"></div>
                                {isAdmin && (
                                    <button
                                        onClick={handleDelete}
                                        className="transition hover:text-red-500"
                                        aria-label="Eliminar archivo"
                                    >
                                        <TrashIcon className="h-6 w-6" />
                                    </button>
                                )}
                                <button 
                                    onClick={handleDownload} 
                                    disabled={isDownloading}
                                    className="transition hover:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Descargar archivo"
                                >
                                    {isDownloading ? <Spinner /> : <DownloadIcon className="h-6 w-6" />}
                                </button>
                            </div>

                            <div className="mt-3 md:hidden">
                                <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{file.name}</p>
                                <p className="mt-1 text-xs text-neutral-500">thebodorriogallery</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaDetail;