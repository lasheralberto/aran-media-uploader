import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listAllFiles, uploadFile } from './services/firebase';
import { MediaFile } from './types';
import Header from './components/Header';
import MediaGrid from './components/MediaGrid';
import UploadProgress from './components/UploadProgress';
import BottomNav from './components/BottomNav';
import MediaModal from './components/MediaModal';

const App: React.FC = () => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMedia = useCallback(async () => {
        setIsLoading(true);
        const files = await listAllFiles();
        setMediaFiles(files);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

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
            await fetchMedia();
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
                />
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