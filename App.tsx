import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listMediaFiles, uploadFile } from './services/firebase';
import { MediaFile } from './types';
import Header from './components/Header';
import MediaGrid from './components/MediaGrid';
import UploadProgress from './components/UploadProgress';
import BottomNav from './components/BottomNav';
import MediaModal from './components/MediaModal';
import Spinner from './components/Spinner';

const App: React.FC = () => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for pagination
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    
    const loadMoreMedia = useCallback(async () => {
        if (!nextPageToken) {
            setHasMore(false);
            return;
        };
        
        setIsLoadingMore(true);
        const { files, nextPageToken: token } = await listMediaFiles(nextPageToken);
        setMediaFiles(prev => [...prev, ...files]);
        setNextPageToken(token);
        if (!token) {
            setHasMore(false);
        }
        setIsLoadingMore(false);
    }, [nextPageToken]);

    // Observer for infinite scroll
    // Fix: `useRef` was called with 0 arguments, but 1 was expected. Initializing with `null`.
    const observer = useRef<IntersectionObserver | null>(null);
    // Fix: Add `loadMoreMedia` to dependency array to avoid stale closures.
    // Fix: The ref callback can receive `null` when the component unmounts. The type should be updated to handle this case.
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMoreMedia();
            }
        });

        if (node) observer.current.observe(node);
    }, [isLoadingMore, hasMore, loadMoreMedia]);


    const fetchInitialMedia = useCallback(async () => {
        setIsLoading(true);
        setHasMore(true); // Reset hasMore on initial fetch
        const { files, nextPageToken: token } = await listMediaFiles();
        setMediaFiles(files);
        setNextPageToken(token);
        if (!token) {
            setHasMore(false);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchInitialMedia();
    }, [fetchInitialMedia]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }

        setIsUploading(true);
        setUploadProgress({});
        
        const uploadPromises = Array.from(files).map((file: File) => {
            return uploadFile(file, (progress) => {
                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            });
        });

        try {
            await Promise.all(uploadPromises);
            // After upload, fetch the first page again to show new media at the top
            await fetchInitialMedia();
        } catch (error) {
            alert('¡Ups! Algo ha fallado en la subida. ¿Quizás la foto es demasiado buena? Revisa la consola.');
            console.error(error);
        } finally {
            setIsUploading(false);
            setUploadProgress({});
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleMediaItemClick = (file: MediaFile) => {
        setSelectedMedia(file);
    };

    const handleCloseModal = () => {
        setSelectedMedia(null);
    };

    const totalProgress = Object.values(uploadProgress).length > 0
        ? Object.values(uploadProgress).reduce((acc: number, curr: number) => acc + curr, 0) / Object.values(uploadProgress).length
        : 0;

    return (
        <div className="min-h-screen font-sans pb-16">
            <Header postCount={mediaFiles.length} />
            
            <main className="container mx-auto">
                {isUploading && <UploadProgress progress={totalProgress} />}
                <MediaGrid 
                    mediaFiles={mediaFiles} 
                    isLoading={isLoading}
                    onItemClick={handleMediaItemClick}
                    lastElementRef={lastElementRef}
                    hasMore={hasMore}
                />
                {isLoadingMore && (
                    <div className="flex justify-center items-center py-8">
                        <Spinner />
                    </div>
                )}
            </main>
            
            <BottomNav onUploadClick={handleUploadClick} />

            <MediaModal file={selectedMedia} onClose={handleCloseModal} />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
                className="hidden"
            />
        </div>
    );
};

export default App;