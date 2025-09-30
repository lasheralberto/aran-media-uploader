
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
            className={`group relative aspect-square bg-gray-300 cursor-pointer transition-transform duration-200 ease-in-out ${!isLoaded ? 'animate-pulse' : ''} ${isSelected ? 'scale-95' : ''}`}
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
                    src={file.url} 
                    alt={file.name} 
                    className={`w-full h-full object-cover transition-opacity duration-300 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setIsLoaded(true)}
                />
            ) : (
                <video 
                    src={`${file.url}#t=0.1`} 
                    className={`w-full h-full object-cover transition-opacity duration-300 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    preload="metadata"
                    onLoadedData={() => setIsLoaded(true)}
                ></video>
            )}
            
            {/* Selection Overlay */}
            {isSelectionMode && (
                <div className={`absolute inset-0 transition-colors duration-200 ${isSelected ? 'bg-black/50' : 'group-hover:bg-black/20'}`}>
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-rose-500 border-rose-500' : 'bg-white/50 border-white'}`}>
                        {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaItem;