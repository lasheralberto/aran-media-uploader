import React from 'react';
import { MediaFile } from '../types';

interface MediaItemProps {
    file: MediaFile;
    onClick: () => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ file, onClick }) => {
    return (
        <div 
            className="group relative aspect-square bg-gray-200 cursor-pointer"
            onClick={onClick}
        >
            {file.type === 'image' ? (
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <video src={`${file.url}#t=0.1`} className="w-full h-full object-cover" preload="metadata"></video>
            )}
        </div>
    );
};

export default MediaItem;