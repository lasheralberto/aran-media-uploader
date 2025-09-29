import React, { useState, useEffect } from 'react';
import { HeartIcon, CheckIcon, OptionsIcon } from './Icons';
import { getProfileImageUrl } from '../services/firebase';
 

interface HeaderProps {
  postCount: number;
  onOpenOptions: () => void;
  isVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ postCount, onOpenOptions, isVisible }) => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
      const fetchImage = async () => {
          setIsLoading(true);
          const url = await getProfileImageUrl();
          setProfileImageUrl(url);
          setIsLoading(false);
      };
      fetchImage();
  }, []);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
        title: 'Boda de Alberto y Mariona',
        text: '¡Comparte tus fotos y vídeos de la boda!',
        url: shareUrl,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            console.error('Error sharing:', error);
        }
    } else {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('No se pudo copiar el enlace.');
        }
    }
  };

  return (
    <header className={`bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 py-5 relative">
        <button 
            onClick={onOpenOptions}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors z-20"
            aria-label="Opciones"
        >
            <OptionsIcon className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-8">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {isLoading ? (
                  <div className="w-full h-full bg-gray-300 animate-pulse" />
              ) : profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                    />

              ) : (
                  <HeartIcon className="h-12 w-12 text-gray-400" />
              )}
            </div>

          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">#TheBodorrioGallery</h1>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <span className="font-bold">{postCount}</span>
                <p className="text-xs text-gray-500">Posts</p>
              </div>
              <div>
                <span className="font-bold">150</span>
                <p className="text-xs text-gray-500">Invitados</p>
              </div>
              <div>
                <span className="font-bold">1.2k</span>
                <p className="text-xs text-gray-500">Likes</p>
              </div>
            </div>
             <button 
                onClick={handleShare}
                className="mt-2 w-full text-sm bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
                aria-label="Compartir galería"
            >
                {isCopied ? (
                    <span className="flex items-center justify-center text-green-600">
                        <CheckIcon className="h-5 w-5 mr-1" />
                        ¡Copiado!
                    </span>
                ) : (
                    'Compartir'
                )}
            </button>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
            📸 Sube fotos o quedas fuera del testamento. <br /> 
            💍 #Alberto&Mariona  <br />
            🍾 Baila primero, etiqueta después.
            </p>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;