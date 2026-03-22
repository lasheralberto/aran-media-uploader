
import React, { useState, useRef } from 'react';
import { MediaFile } from '../types';
import { CheckIcon } from './Icons';

interface MediaItemProps {
    file: MediaFile;
    onClick: () => void;
    isSelectionMode: boolean;
    isSelected: boolean;
    onLongPress: () => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ file, onClick, isSelectionMode, isSelected, onLongPress }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const timerRef = useRef<number | null>(null);
    const isLongPress = useRef(false);
    const imageSource = file.previewUrl ?? file.url;

    const handleInteractionStart = () => {
        isLongPress.current = false;
        timerRef.current = window.setTimeout(() => {
            isLongPress.current = true;
            onLongPress();
        }, 700); // 700ms for a long press
    };

    const handleInteractionEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleClick = () => {
        if (!isLongPress.current) {
            onClick();
        }
    };


    return (
        <div 
            className={`group relative aspect-square overflow-hidden bg-neutral-200 cursor-pointer transition duration-300 ease-out ${!isLoaded ? 'animate-pulse' : ''} ${isSelected ? 'scale-[0.98]' : 'hover:z-10 hover:scale-[1.01]'}`}
            onClick={handleClick}
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            onMouseLeave={handleInteractionEnd}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press on desktop
        >
            {file.type === 'image' ? (
                <img 
                    src={imageSource} 
                    alt={file.name} 
                    className={`h-full w-full object-cover transition duration-300 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isSelectionMode ? '' : 'group-hover:brightness-[0.92]'}`}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    onLoad={() => setIsLoaded(true)}
                />
            ) : (
                <video 
                    src={`${file.url}#t=0.1`} 
                    className={`h-full w-full object-cover transition duration-300 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isSelectionMode ? '' : 'group-hover:brightness-[0.92]'}`}
                    preload="metadata"
                    onLoadedData={() => setIsLoaded(true)}
                ></video>
            )}

            {!isSelectionMode && (
                <>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                    {file.type === 'video' && (
                        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                            Reel
                        </div>
                    )}
                </>
            )}
            
            {isSelectionMode && (
                <div className={`absolute inset-0 transition-colors duration-200 ${isSelected ? 'bg-black/35' : 'bg-black/10'}`}>
                    <div className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${isSelected ? 'border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'border-white bg-black/20 text-transparent backdrop-blur-sm'}`}>
                        {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaItem;