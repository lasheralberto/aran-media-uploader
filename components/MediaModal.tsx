import React from 'react';
import { MediaFile } from '../types';
import { CloseIcon, HeartIcon, CommentIcon, ShareIcon } from './Icons';

interface MediaModalProps {
    file: MediaFile | null;
    onClose: () => void;
}

const MediaModal: React.FC<MediaModalProps> = ({ file, onClose }) => {
    if (!file) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50" onClick={onClose}>
            <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-10 right-0 text-white z-10">
                    <CloseIcon className="h-8 w-8"/>
                </button>

                <div className="flex-grow flex items-center justify-center p-2">
                    {file.type === 'image' ? (
                        <img src={file.url} alt={file.name} className="max-w-full max-h-[70vh] object-contain" />
                    ) : (
                        <video src={file.url} className="max-w-full max-h-[70vh] object-contain" controls autoPlay></video>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                        <button className="text-gray-600 hover:text-red-500"><HeartIcon /></button>
                        <button className="text-gray-600 hover:text-gray-900"><CommentIcon /></button>
                        <button className="text-gray-600 hover:text-gray-900"><ShareIcon /></button>
                    </div>
                    <p className="text-sm font-bold mt-2">123 likes</p>
                    <p className="text-sm mt-1">
                        <span className="font-bold">invitado_1</span> ¡Qué fotaza! 🎉
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MediaModal;
