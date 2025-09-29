import React from 'react';
import { UploadIcon } from './Icons';

interface BottomNavProps {
    onUploadClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onUploadClick }) => {
    return (
        <button 
            onClick={onUploadClick} 
            className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-300 z-20"
            aria-label="Añadir foto o vídeo"
        >
            <UploadIcon className="w-8 h-8" />
        </button>
    );
};

export default BottomNav;