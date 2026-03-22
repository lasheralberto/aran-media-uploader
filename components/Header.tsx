import React, { useEffect, useState } from 'react';
import { HeartIcon, CheckIcon, CloseIcon, ShareIcon } from './Icons';
import { getProfileImageUrl } from '../services/firebase';

interface HeaderProps {
  postCount: number;
  onOpenOptions: () => void;
  isVisible: boolean;
  userId: string;
  currentUserName: string;
  onSignOut: () => Promise<void> | void;
  isSelectionModeActive: boolean;
  selectedItemsCount: number;
  onCancelSelection: () => void;
}

const Header: React.FC<HeaderProps> = ({
  postCount,
  onOpenOptions,
  isVisible,
  userId,
  currentUserName,
  onSignOut,
  isSelectionModeActive,
  selectedItemsCount,
  onCancelSelection
}) => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      setIsLoading(true);
      try {
        const url = await getProfileImageUrl(userId);
        if (url) {
          setProfileImageUrl(url);
        }
      } catch (error) {
        console.error('Error loading profile image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [userId]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: 'Boda de Alberto y Mariona',
      text: 'Comparte tus fotos y videos de la boda.',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('No se pudo copiar el enlace.');
    }
  };

  if (isSelectionModeActive) {
    return (
      <header className={`sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="mx-auto flex max-w-[935px] items-center justify-between px-4 py-3 md:px-5">
          <button onClick={onCancelSelection} className="-ml-2 rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900" aria-label="Cancelar selección">
            <CloseIcon className="h-6 w-6" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">Selección</p>
            <h2 className="text-base font-semibold text-neutral-900">{selectedItemsCount} elemento{selectedItemsCount > 1 ? 's' : ''} seleccionado{selectedItemsCount > 1 ? 's' : ''}</h2>
          </div>
          <div className="w-10" />
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="mx-auto max-w-[935px] px-4 py-4 md:px-5 md:py-7">
        <div className="flex flex-col gap-5 md:gap-7">
          <div className="flex items-start gap-4 md:gap-8">
            <button
              onClick={onOpenOptions}
              className="shrink-0 rounded-full bg-gradient-to-tr from-fuchsia-600 via-rose-500 to-amber-400 p-[2px] focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
              aria-label="Opciones de administrador"
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white md:h-36 md:w-36">
                {isLoading ? (
                  <div className="h-full w-full animate-pulse bg-neutral-200" />
                ) : profileImageUrl ? (
                  <img src={profileImageUrl} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  <HeartIcon className="h-10 w-10 text-neutral-300 md:h-16 md:w-16" />
                )}
              </div>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 md:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold text-neutral-900">thebodorriogallery</h1>
                    <p className="text-sm text-neutral-500">Alberto y Mariona · {currentUserName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
                      aria-label="Compartir galería"
                    >
                      {isCopied ? (
                        <>
                          <CheckIcon className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-600">Copiado</span>
                        </>
                      ) : (
                        <>
                          <ShareIcon className="h-4 w-4" />
                          <span>Compartir</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={onSignOut}
                      className="inline-flex items-center rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
                      aria-label="Cerrar sesión"
                    >
                      Salir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-base font-semibold text-neutral-900">{postCount}</div>
                    <div className="text-xs text-neutral-500">publicaciones</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-neutral-900">150</div>
                    <div className="text-xs text-neutral-500">invitados</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-neutral-900">1.2k</div>
                    <div className="text-xs text-neutral-500">me gusta</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm leading-5 text-neutral-700">
                                   
                  <p className="text-neutral-500">#AlbertoYMariona #TheBodorrioGallery</p>
                </div>
              </div>

              <div className="hidden md:flex md:flex-col md:gap-5">
                <div className="flex items-center gap-6">
                  <div>
                    <h1 className="text-[28px] font-light tracking-tight text-neutral-900">thebodorriogallery</h1>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
                      aria-label="Compartir galería"
                    >
                      {isCopied ? (
                        <>
                          <CheckIcon className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-600">Enlace copiado</span>
                        </>
                      ) : (
                        <>
                          <ShareIcon className="h-4 w-4" />
                          <span>Compartir perfil</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={onSignOut}
                      className="inline-flex items-center rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
                      aria-label="Cerrar sesión"
                    >
                      Cerrar sesion
                    </button>
                  </div>
                </div>

                <div className="flex gap-8 text-[15px] text-neutral-700">
                  <div>
                    <span className="font-semibold text-neutral-900">{postCount}</span>
                    <span className="ml-1">publicaciones</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900">150</span>
                    <span className="ml-1">invitados</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900">1.2k</span>
                    <span className="ml-1">me gusta</span>
                  </div>
                </div>

                <div className="max-w-xl space-y-1.5 text-sm leading-6 text-neutral-700">
                  <p className="font-semibold text-neutral-900">Boda de Alberto y Mariona</p>
                  <p>170126</p>
                  <p className="text-neutral-500">#TheBodorrioGallery #AlbertoYMariona</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
