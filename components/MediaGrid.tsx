import React from 'react';
import { MediaFile } from '../types';
import MediaItem from './MediaItem';
import Spinner from './Spinner';

interface MediaGridProps {
    mediaFiles: MediaFile[];
    isLoading: boolean;
    onItemClick: (file: MediaFile) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({ mediaFiles, isLoading, onItemClick }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner />
            </div>
        );
    }

    if (mediaFiles.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <h2 className="text-xl font-semibold text-gray-700">Aún no hay recuerdos</h2>
                <p className="text-gray-500 mt-2">¡Sé el primero en compartir un momento especial!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-0.5">
            {mediaFiles.map((file) => (
                <MediaItem key={file.name} file={file} onClick={() => onItemClick(file)} />
            ))}
        </div>
    );
};

export default MediaGrid;