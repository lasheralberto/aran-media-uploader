import React from 'react';

interface GalleryLoadStatusProps {
    loadedCount: number;
    totalCount: number;
    isLoadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
}

const GalleryLoadStatus: React.FC<GalleryLoadStatusProps> = ({ loadedCount, totalCount, isLoadingMore, hasMore, onLoadMore }) => {
    if (totalCount === 0 && loadedCount === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 md:bottom-8">
            <button
                type="button"
                onClick={onLoadMore}
                disabled={!hasMore || isLoadingMore}
                className="rounded-full border border-neutral-200 bg-white/92 px-4 py-2 text-xs font-semibold text-neutral-700 shadow-[0_12px_30px_rgba(17,17,17,0.12)] backdrop-blur-md transition hover:bg-white disabled:cursor-default disabled:opacity-80 md:text-sm"
                aria-label={hasMore ? 'Cargar más fotos' : 'Todas las fotos están cargadas'}
            >
                <span>{loadedCount} / {totalCount} cargadas</span>
                {isLoadingMore && <span className="ml-2 text-neutral-500">Cargando...</span>}
                {!isLoadingMore && hasMore && <span className="ml-2 text-neutral-500">Toca para cargar más</span>}
            </button>
        </div>
    );
};

export default GalleryLoadStatus;