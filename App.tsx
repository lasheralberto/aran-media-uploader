
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listAllFiles, uploadFile } from './services/firebase';
import { MediaFile } from './types';
import Header from './components/Header';
import MediaGrid from './components/MediaGrid';
import UploadProgress from './components/UploadProgress';
import { UploadIcon } from './components/Icons';

const App: React.FC = () => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
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

    const totalProgress = Object.values(uploadProgress).length > 0
        ? Object.values(uploadProgress).reduce((acc: number, curr: number) => acc + curr, 0) / Object.values(uploadProgress).length
        : 0;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Nuestra Montaña de Recuerdos</h1>
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-lg shadow-cyan-600/30"
                    >
                        <UploadIcon />
                        {isUploading ? 'Subiendo momentazo...' : '¡Sube la prueba del delito!'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                    />
                </div>

                {isUploading && <UploadProgress progress={totalProgress} />}
                
                <MediaGrid mediaFiles={mediaFiles} isLoading={isLoading} />
            </main>
        </div>
    );
};

export default App;