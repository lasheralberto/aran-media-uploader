
import React from 'react';
import { MediaFile } from '../types';
import MediaItem from './MediaItem';
import SkeletonItem from './SkeletonItem';

interface MediaGridProps {
    mediaFiles: MediaFile[];
    isLoading: boolean;
    onItemClick: (file: MediaFile) => void;
    lastElementRef: (node: HTMLDivElement | null) => void;
    hasMore: boolean;
    selectionMode: boolean;
    selectedItems: string[];
    onLongPress: (file: MediaFile) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({ mediaFiles, isLoading, onItemClick, lastElementRef, hasMore, selectionMode, selectedItems, onLongPress }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-3 md:gap-1 gap-0.5">
                {Array.from({ length: 9 }).map((_, index) => (
                    <SkeletonItem key={index} />
                ))}
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
        <div className="grid grid-cols-3 md:gap-1 gap-0.5">
            {mediaFiles.map((file, index) => {
                const isLastElement = mediaFiles.length === index + 1;
                const item = (
                     <MediaItem
                        file={file}
                        onClick={() => onItemClick(file)}
                        isSelectionMode={selectionMode}
                        isSelected={selectedItems.includes(file.name)}
                        onLongPress={() => onLongPress(file)}
                    />
                );

                if (isLastElement && hasMore) {
                    return (
                        <div ref={lastElementRef} key={file.name}>
                           {item}
                        </div>
                    );
                }
                return <div key={file.name}>{item}</div>;
            })}
        </div>
    );
};

export default MediaGrid;
