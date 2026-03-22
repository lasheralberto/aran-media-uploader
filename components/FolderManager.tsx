import React, { useMemo, useState } from 'react';
import { normalizeFolderName } from '../services/firebase';
import { CloseIcon } from './Icons';

interface FolderManagerProps {
    isCreating: boolean;
    onCreateFolder: (folderName: string) => Promise<void>;
    onClose: () => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({
    isCreating,
    onCreateFolder,
    onClose,
}) => {
    const [draftName, setDraftName] = useState('');
    const normalizedDraftName = useMemo(() => normalizeFolderName(draftName), [draftName]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!normalizedDraftName || isCreating) {
            return;
        }

        await onCreateFolder(draftName);
        setDraftName('');
    };

    return (
        <section className="mb-4 rounded-[28px] border border-neutral-200 bg-neutral-50 px-4 py-4 shadow-sm md:mb-6 md:px-5 md:py-5">
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Modo admin</p>
                        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Crear carpeta de subida</h2>
                        <p className="text-sm text-neutral-500">Las nuevas fotos y vídeos se guardarán en la pestaña de destino que selecciones en la galería.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
                        aria-label="Ocultar creador de carpetas"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="flex-1">
                        <span className="mb-2 block text-sm font-medium text-neutral-700">Nueva carpeta</span>
                        <input
                            type="text"
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            placeholder="Ej. Mesa novios"
                            className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                            disabled={isCreating}
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={!normalizedDraftName || isCreating}
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isCreating ? 'Creando...' : 'Crear carpeta'}
                    </button>
                </form>

                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/80 px-4 py-3 text-sm text-neutral-600">
                    <span className="font-semibold text-neutral-900">Nombre normalizado:</span>{' '}
                    {normalizedDraftName || 'Se generará al escribir un nombre válido'}
                </div>
            </div>
        </section>
    );
};

export default FolderManager;