import React from 'react';
import { GridIcon, UploadIcon } from './Icons';

interface BottomNavProps {
    onUploadClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onUploadClick }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-10">
            <div className="container mx-auto flex justify-around items-center h-16">
                <button className="flex flex-col items-center justify-center text-gray-600 hover:text-rose-500 transition-colors w-24" aria-label="Ver galería">
                    <GridIcon className="h-6 w-6" />
                    <span className="text-xs mt-1">Galería</span>
                </button>
                <button 
                    onClick={onUploadClick} 
                    className="flex items-center justify-center gap-2 text-rose-500 font-bold text-lg hover:text-rose-600 transition-colors focus:outline-none w-24"
                    aria-label="Añadir foto o vídeo"
                >
                    <UploadIcon />
                    Subir
                </button>
            </div>
        </nav>
    );
};

export default BottomNav;