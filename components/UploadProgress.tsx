import React from 'react';
import { UploadBatchState } from '../types';

interface UploadProgressProps {
    state: UploadBatchState;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ state }) => {
    const uploadedMegabytes = state.transferredBytes / (1024 * 1024);
    const totalMegabytes = state.totalBytes / (1024 * 1024);

    return (
        <div className="sticky top-[72px] z-20 mb-4 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:top-[88px] md:rounded-xl md:border md:px-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                <span>Subida industrial</span>
                <span>{Math.round(state.progress)}%</span>
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-700">
                <span className="font-semibold text-neutral-900">{state.completedFiles}/{state.totalFiles} completados</span>
                <span>{state.activeFiles} activos</span>
                <span>{state.queuedFiles} en cola</span>
                {state.failedFiles > 0 && <span className="text-red-600">{state.failedFiles} fallidos</span>}
            </div>

            <div className="mb-3 text-xs text-neutral-500">
                {uploadedMegabytes.toFixed(1)} MB de {totalMegabytes.toFixed(1)} MB | Paralelismo {state.maxConcurrency}
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                <div 
                    className="h-1 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 transition-all duration-300 ease-out" 
                    style={{ width: `${state.progress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default UploadProgress;