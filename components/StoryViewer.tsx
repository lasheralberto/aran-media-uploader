
import React, { useState, useEffect, useRef } from 'react';
import { MediaFile } from '../types';
import { CloseIcon } from './Icons';

interface StoryViewerProps {
    media: MediaFile[];
    onClose: () => void;
}

const STORY_DURATION = 10000; // 10 seconds

const StoryViewer: React.FC<StoryViewerProps> = ({ media, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const currentFile = media[currentIndex];

    const goToNext = () => {
        setCurrentIndex(prev => (prev < media.length - 1 ? prev + 1 : prev));
        if (currentIndex === media.length - 1) {
            onClose();
        }
    };

    const goToPrevious = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : 0));
    };

    useEffect(() => {
        const startTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(goToNext, STORY_DURATION);
        };

        if (currentFile.type === 'image' && !isPaused) {
            startTimer();
        } else if (currentFile.type === 'video' && !isPaused && videoRef.current) {
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [currentIndex, isPaused, currentFile.type]);

    const handleInteractionStart = () => {
        setIsPaused(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (videoRef.current) videoRef.current.pause();
    };

    const handleInteractionEnd = () => {
        setIsPaused(false);
    };

    return (
        <div 
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center animate-fade-in"
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
        >
            {/* Progress Bars */}
            <div className="absolute top-2 left-2 right-2 flex items-center gap-1 z-10">
                {media.map((_, index) => (
                    <div key={index} className="w-full h-1 bg-white/30 rounded-full">
                        <div 
                            className="h-1 bg-white rounded-full"
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
            
            <button onClick={onClose} className="absolute top-4 right-4 text-white z-20 bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors">
                <CloseIcon className="h-6 w-6"/>
            </button>

            {/* Content */}
            <div className="relative w-full h-full flex items-center justify-center">
                {currentFile.type === 'image' ? (
                    <img src={currentFile.url} alt={currentFile.name} className="max-w-full max-h-full object-contain" />
                ) : (
                    <video 
                        ref={videoRef}
                        src={currentFile.url} 
                        className="max-w-full max-h-full object-contain"
                        onEnded={goToNext}
                        playsInline
                        muted // Muted autoplay is more likely to succeed
                    />
                )}
            </div>

            {/* Navigation Areas */}
            <div className="absolute left-0 top-0 h-full w-1/3" onClick={(e) => { e.stopPropagation(); goToPrevious(); }} />
            <div className="absolute right-0 top-0 h-full w-1/3" onClick={(e) => { e.stopPropagation(); goToNext(); }} />
        </div>
    );
};

export default StoryViewer;
