
import React from 'react';

interface UploadProgressProps {
    progress: number;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ progress }) => {
    return (
        <div className="mb-6">
            <p className="text-sm text-slate-400 mb-2">Enviando al nido de amor... {Math.round(progress)}%</p>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default UploadProgress;