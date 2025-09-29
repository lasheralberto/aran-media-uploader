
import React from 'react';
import { MediaFile } from '../types';
import MediaItem from './MediaItem';
import Spinner from './Spinner';

interface MediaGridProps {
    mediaFiles: MediaFile[];
    isLoading: boolean;
}

const MediaGrid: React.FC<MediaGridProps> = ({ mediaFiles, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner />
            </div>
        );
    }

    if (mediaFiles.length === 0) {
        return (
            <div className="text-center py-16 px-4 bg-slate-800/50 rounded-lg">
                <h2 className="text-2xl font-semibold text-slate-300">¡El álbum está más vacío que la pista al principio!</h2>
                <p className="text-slate-400 mt-2">¡Sé el primero en subir una foto y romper el hielo (metafóricamente, claro)!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mediaFiles.map((file) => (
                <MediaItem key={file.name} file={file} />
            ))}
        </div>
    );
};

export default MediaGrid;