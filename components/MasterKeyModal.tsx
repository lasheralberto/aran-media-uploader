import React, { useState, useEffect } from 'react';
import { CloseIcon } from './Icons';

interface MasterKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (key: string) => void;
}

const MasterKeyModal: React.FC<MasterKeyModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [key, setKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            setKey(''); // Reset key on open
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(key);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
            <div className="relative bg-white rounded-lg max-w-sm w-full p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <CloseIcon className="h-6 w-6"/>
                </button>
                <h2 className="text-xl font-semibold text-center text-gray-800 mb-4">Master Key</h2>
                <p className="text-center text-gray-500 mb-6">Introduce la clave de administrador para habilitar opciones avanzadas.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-rose-400"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="mt-6 w-full bg-rose-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
                    >
                        Desbloquear
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MasterKeyModal;