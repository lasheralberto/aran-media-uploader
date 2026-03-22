import React from 'react';
import { CloseIcon } from './Icons';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm rounded-[26px] bg-white p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.18)]" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">
                    <CloseIcon className="h-6 w-6"/>
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Confirmación</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">{message}</p>
                <div className="mt-7 flex justify-center gap-3">
                    <button
                        onClick={onClose}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;