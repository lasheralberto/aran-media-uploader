
import React, { useState } from 'react';
import { MediaFile } from '../types';
import { BackIcon, HeartIcon, CommentIcon, ShareIcon, DownloadIcon, CheckIcon, TrashIcon } from './Icons';
import Spinner from './Spinner';

interface MediaDetailProps {
    file: MediaFile;
    onBack: () => void;
    isAdmin: boolean;
    onDelete: (fileName: string) => void;
}

const MediaDetail: React.FC<MediaDetailProps> = ({ file, onBack, isAdmin, onDelete }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

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
        <div className="fixed inset-0 bg-black z-50 animate-fade-in">
            <button 
                onClick={onBack} 
                className="absolute top-4 left-4 text-white z-20 bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors"
                aria-label="Volver a la galería"
            >
                <BackIcon className="h-6 w-6"/>
            </button>

            <div className="h-full w-full flex items-center justify-center p-4">
                {file.type === 'image' ? (
                    <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain" />
                ) : (
                    <video src={file.url} className="max-w-full max-h-full object-contain" controls autoPlay></video>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <div className="container mx-auto max-w-3xl flex items-center gap-4 text-white">
                    <button className="hover:text-red-400"><HeartIcon /></button>
                    <button className="hover:text-gray-300"><CommentIcon /></button>
                    <button 
                        onClick={handleShare} 
                        disabled={isSharing}
                        className="hover:text-gray-300 disabled:opacity-50"
                    >
                        {isCopied ? <CheckIcon className="text-green-400"/> : <ShareIcon />}
                    </button>
                    <div className="flex-grow"></div>
                    {isAdmin && (
                        <button
                            onClick={handleDelete}
                            className="hover:text-red-400 transition-colors"
                            aria-label="Eliminar archivo"
                        >
                            <TrashIcon />
                        </button>
                    )}
                    <button 
                        onClick={handleDownload} 
                        disabled={isDownloading}
                        className="hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Descargar archivo"
                    >
                        <DownloadIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MediaDetail;