import React, { useState } from 'react';
import { MediaFile } from '../types';
import { CloseIcon, HeartIcon, CommentIcon, ShareIcon, DownloadIcon, CheckIcon, TrashIcon } from './Icons';
import { downloadFileBlob } from '../services/firebase';

interface MediaModalProps {
    file: MediaFile | null;
    onClose: () => void;
    isAdmin: boolean;
    onDelete: (fileName: string) => void;
}

const MediaModal: React.FC<MediaModalProps> = ({ file, onClose, isAdmin, onDelete }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    if (!file) return null;

    const handleDelete = () => {
        if (!file) return;
        onDelete(file.name);
    };

    const handleDownload = async () => {
        if (!file) return;

        setIsDownloading(true);
        try {
            const blob = await downloadFileBlob(file.name);
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = file.name;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Error downloading file:", error);
            alert("No se pudo descargar el archivo. Por favor, inténtalo de nuevo.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleShare = async () => {
        if (!file) return;
        setIsSharing(true);

        const shareData = {
            title: `Recuerdo de la boda: ${file.name}`,
            text: '¡Mira esta foto de la boda de Alberto y Mariona!',
            url: file.url
        };

        try {
            if (navigator.share && navigator.canShare) {
                const blob = await downloadFileBlob(file.name);
                const fileToShare = new File([blob], file.name, { type: blob.type });
                if (navigator.canShare({ files: [fileToShare] })) {
                    await navigator.share({
                        files: [fileToShare],
                        title: shareData.title,
                        text: shareData.text,
                    });
                    setIsSharing(false);
                    return;
                }
            }
        } catch (e) {
            console.warn("Couldn't share file directly, falling back to URL share.", e);
        }
        if (navigator.share) {
             try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Error sharing URL:', error);
            }
        } else {
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
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50" onClick={onClose}>
            <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-10 right-0 text-white z-10">
                    <CloseIcon className="h-8 w-8"/>
                </button>

                <div className="flex-grow flex items-center justify-center p-2">
                    {file.type === 'image' ? (
                        <img src={file.url} alt={file.name} className="max-w-full max-h-[70vh] object-contain" />
                    ) : (
                        <video src={file.url} className="max-w-full max-h-[70vh] object-contain" controls autoPlay></video>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                        <button className="text-gray-600 hover:text-red-500"><HeartIcon /></button>
                        <button className="text-gray-600 hover:text-gray-900"><CommentIcon /></button>
                        <button 
                            onClick={handleShare} 
                            disabled={isSharing}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                            {isCopied ? <CheckIcon className="text-green-500"/> : <ShareIcon />}
                        </button>
                        <div className="flex-grow"></div>
                        {isAdmin && (
                            <button
                                onClick={handleDelete}
                                className="text-gray-600 hover:text-red-500 transition-colors"
                                aria-label="Eliminar archivo"
                            >
                                <TrashIcon />
                            </button>
                        )}
                        <button 
                            onClick={handleDownload} 
                            disabled={isDownloading}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Descargar archivo"
                        >
                            <DownloadIcon />
                        </button>
                    </div>
                    <p className="text-sm font-bold mt-2">123 likes</p>
                    <p className="text-sm mt-1">
                        <span className="font-bold">invitado_1</span> ¡Qué fotaza! 🎉
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MediaModal;