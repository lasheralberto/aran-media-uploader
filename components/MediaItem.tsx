
import React, { useState } from 'react';
import { MediaFile } from '../types';

interface MediaItemProps {
    file: MediaFile;
    onClick: () => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ file, onClick }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div 
            className={`group relative aspect-square bg-gray-300 cursor-pointer ${!isLoaded ? 'animate-pulse' : ''}`}
            onClick={onClick}
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
        </div>
    );
};

export default MediaItem;