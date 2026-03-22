
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
            <div className="grid grid-cols-3 gap-[2px] border-y border-neutral-200 bg-neutral-200 md:gap-1 md:rounded-[4px] md:border md:bg-transparent">
                {Array.from({ length: 9 }).map((_, index) => (
                    <SkeletonItem key={index} />
                ))}
            </div>
        );
    }

    if (mediaFiles.length === 0) {
        return (
            <div className="px-4 py-20 text-center md:rounded-[28px] md:border md:border-neutral-200 md:bg-neutral-50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Feed vacío</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">Aún no hay recuerdos publicados</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">Sé el primero en subir una foto o un vídeo para que este perfil empiece a parecer un álbum vivo.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-[2px] border-y border-neutral-200 bg-neutral-200 md:gap-1 md:rounded-[4px] md:border md:bg-transparent">
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
