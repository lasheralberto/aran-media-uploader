import React, { useEffect, useRef, useState } from 'react';
import { MediaFile } from '../types';
import { CloseIcon } from './Icons';

interface StoryViewerProps {
    media: MediaFile[];
    onClose: () => void;
}

const STORY_DURATION = 10000;

const StoryViewer: React.FC<StoryViewerProps> = ({ media, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const currentFile = media[currentIndex];

    const goToNext = () => {
        setCurrentIndex(prev => {
            if (prev >= media.length - 1) {
                onClose();
                return prev;
            }
            return prev + 1;
        });
    };

    const goToPrevious = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : 0));
    };

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (currentFile.type === 'image' && !isPaused) {
            timerRef.current = window.setTimeout(goToNext, STORY_DURATION);
        }

        if (currentFile.type === 'video' && videoRef.current) {
            if (isPaused) {
                videoRef.current.pause();
            } else {
                videoRef.current.play().catch(error => console.error('Video play failed:', error));
            }
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [currentFile.type, currentIndex, isPaused]);

    const handleInteractionStart = () => {
        setIsPaused(true);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (videoRef.current) {
            videoRef.current.pause();
        }
    };

    const handleInteractionEnd = () => {
        setIsPaused(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black animate-fade-in"
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
        >
            <div className="absolute left-3 right-3 top-3 z-10 flex items-center gap-1 md:left-6 md:right-6 md:top-5">
                {media.map((_, index) => (
                    <div key={index} className="h-[3px] w-full rounded-full bg-white/25">
                        <div
                            className="h-[3px] rounded-full bg-white"
                            style={{
                                width: index < currentIndex ? '100%' : index === currentIndex ? '0%' : '0%',
                                animation: index === currentIndex && !isPaused && currentFile.type === 'image' ? `progress-bar ${STORY_DURATION / 1000}s linear` : 'none',
                            }}
                        />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes progress-bar {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>

            <div className="absolute left-3 right-3 top-7 z-20 flex items-center justify-between md:left-6 md:right-6 md:top-9">
                <div className="flex items-center gap-3 text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-600 via-rose-500 to-amber-400 p-[2px]">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold">AM</div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">thebodorriogallery</p>
                        <p className="text-xs text-white/70">Historias destacadas</p>
                    </div>
                </div>

                <button onClick={onClose} className="rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50" aria-label="Cerrar historias">
                    <CloseIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="relative flex h-full w-full items-center justify-center px-4 pb-6 pt-20 md:px-10 md:pb-10 md:pt-24">
                <div className="relative flex h-full w-full max-w-md items-center justify-center overflow-hidden rounded-[28px] bg-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:max-w-[430px]">
                    {currentFile.type === 'image' ? (
                        <img src={currentFile.url} alt={currentFile.name} className="max-h-full w-full object-contain" />
                    ) : (
                        <video
                            ref={videoRef}
                            src={currentFile.url}
                            className="max-h-full w-full object-contain"
                            onEnded={goToNext}
                            playsInline
                            muted
                        />
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent px-4 pb-5 pt-12 text-white">
                        <p className="line-clamp-1 text-sm font-medium">{currentFile.name}</p>
                        <p className="mt-1 text-xs text-white/70">Pulsa a la derecha para avanzar y a la izquierda para volver</p>
                    </div>
                </div>
            </div>

            <div className="absolute left-0 top-0 h-full w-1/3" onClick={(e) => { e.stopPropagation(); goToPrevious(); }} />
            <div className="absolute right-0 top-0 h-full w-1/3" onClick={(e) => { e.stopPropagation(); goToNext(); }} />
        </div>
    );
};

export default StoryViewer;
