
import React from 'react';
import { MediaFile } from '../types';

interface MediaItemProps {
    file: MediaFile;
}

const MediaItem: React.FC<MediaItemProps> = ({ file }) => {
    return (
        <div className="group relative aspect-square bg-slate-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-cyan-400/30">
            {file.type === 'image' ? (
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <video src={file.url} className="w-full h-full object-cover" controls preload="metadata"></video>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs truncate">{file.name.substring(file.name.indexOf('-') + 1)}</p>
            </div>
        </div>
    );
};

export default MediaItem;