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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm rounded-[26px] bg-white p-7 shadow-[0_24px_60px_rgba(0,0,0,0.18)]" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">
                    <CloseIcon className="h-6 w-6"/>
                </button>
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Administrador</p>
                <h2 className="mb-3 mt-3 text-center text-2xl font-semibold tracking-tight text-neutral-900">Acceso privado</h2>
                <p className="mb-6 text-center text-sm leading-6 text-neutral-500">Introduce la clave para habilitar las acciones de moderación de la galería.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-center text-base focus:outline-none focus:ring-2 focus:ring-rose-400"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="mt-5 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
                    >
                        Desbloquear
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MasterKeyModal;