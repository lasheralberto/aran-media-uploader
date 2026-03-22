import React from 'react';

interface GalleryLoadStatusProps {
    loadedCount: number;
    totalCount: number;
    isLoadingMore: boolean;
}

const GalleryLoadStatus: React.FC<GalleryLoadStatusProps> = ({ loadedCount, totalCount, isLoadingMore }) => {
    if (totalCount === 0 && loadedCount === 0) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-20 -translate-x-1/2 md:bottom-8">
            <div className="rounded-full border border-neutral-200 bg-white/92 px-4 py-2 text-xs font-semibold text-neutral-700 shadow-[0_12px_30px_rgba(17,17,17,0.12)] backdrop-blur-md md:text-sm">
                <span>{loadedCount} / {totalCount} cargadas</span>
                {isLoadingMore && <span className="ml-2 text-neutral-500">Cargando...</span>}
            </div>
        </div>
    );
};

export default GalleryLoadStatus;