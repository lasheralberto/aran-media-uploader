import React from 'react';

interface UploadProgressProps {
    progress: number;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ progress }) => {
    return (
        <div className="my-4 px-4">
            <p className="text-sm text-gray-500 mb-2">Subiendo recuerdo... {Math.round(progress)}%</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                    className="bg-rose-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default UploadProgress;