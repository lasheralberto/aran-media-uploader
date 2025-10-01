
import React, { useState, useEffect } from 'react';
import { HeartIcon, CheckIcon, CloseIcon, ChurchIcon, CelebrationIcon, PartyIcon, ShareIcon } from './Icons';
import { getProfileImageUrl } from '../services/firebase';
 
type CategoryInfo = {
  id: string;
  label: string;
};

interface HeaderProps {
  postCount: number;
  onOpenOptions: () => void;
  isVisible: boolean;
  userId: string;
  isSelectionModeActive: boolean;
  selectedItemsCount: number;
  onCancelSelection: () => void;
  categoriesWithContent: CategoryInfo[];
  onCategoryBubbleClick: (categoryId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    postCount, 
    onOpenOptions, 
    isVisible, 
    userId,
    isSelectionModeActive,
    selectedItemsCount,
    onCancelSelection,
    categoriesWithContent,
    onCategoryBubbleClick
}) => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    console.log('📱 Header received categories:', categoriesWithContent);
  }, [categoriesWithContent]);

  useEffect(() => {
    const fetchImage = async () => {
        setIsLoading(true);
        try {
            const url = await getProfileImageUrl(userId);
            if (url) {
                setProfileImageUrl(url);
            }
        } catch (error) {
            console.error("Error loading profile image:", error);
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

  if (isSelectionModeActive) {
      return (
        <header className={`bg-white/90 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <button onClick={onCancelSelection} className="p-2 -ml-2 text-gray-600 hover:text-gray-900" aria-label="Cancelar selección">
                    <CloseIcon className="h-6 w-6"/>
                </button>
                <h2 className="text-lg font-bold text-gray-800">{selectedItemsCount} seleccionado(s)</h2>
                {/* Spacer to balance the header */}
                <div className="w-10"></div>
            </div>
        </header>
      );
  }


  return (
    <header className={`bg-white sticky top-0 z-10 border-b border-gray-200 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col gap-3">
            {/* Row for avatar and KPIs */}
            <div className="flex items-center gap-5">
                <button 
                    onClick={onOpenOptions}
                    className="flex-shrink-0 p-[2px] rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    aria-label="Opciones de administrador"
                >
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white flex items-center justify-center border-2 border-white">
                    {isLoading ? (
                        <div className="w-full h-full bg-gray-300 animate-pulse" />
                    ) : profileImageUrl ? (
                        <img
                            src={profileImageUrl}
                            alt="Perfil"
                            className="w-full h-full object-cover"
                            />

                    ) : (
                        <HeartIcon className="h-10 w-10 text-gray-400" />
                    )}
                    </div>
                </button>

                <div className="flex-grow flex justify-around items-center text-center">
                    <div>
                        <div className="font-semibold text-base">{postCount}</div>
                        <div className="text-xs text-gray-500">publicaciones</div>
                    </div>
                    <div>
                        <div className="font-semibold text-base">150</div>
                        <div className="text-xs text-gray-500">invitados</div>
                    </div>
                    <div>
                        <div className="font-semibold text-base">1.2k</div>
                        <div className="text-xs text-gray-500">me gusta</div>
                    </div>
                </div>
            </div>
            
            {/* Column for Bio and other info */}
            <div className="space-y-1">
                <h1 className="font-semibold text-sm">#TheBodorrioGallery</h1>
                <p className="text-sm leading-tight">
                📸 Sube fotos o quedas fuera del testamento.{' '}
                💍 #Alberto&Mariona{' '}
                🍾 Baila primero, etiqueta después.
                </p>
                <button 
                    onClick={handleShare}
                    className="mt-2 w-full py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-black text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    aria-label="Compartir galería"
                >
                    {isCopied ? (
                        <>
                            <CheckIcon className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">¡Copiado!</span>
                        </>
                    ) : (
                        <>
                            <ShareIcon className="h-4 w-4" />
                            <span>Compartir perfil</span>
                        </>
                    )}
                </button>
            </div>

            {/* Story Bubbles - Instagram Style */}
            {categoriesWithContent.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-4 -mx-4 px-4 overflow-x-auto pb-1 scrollbar-hide">
                        {categoriesWithContent.map(category => (
                            <button 
                                key={category.id}
                                onClick={() => onCategoryBubbleClick(category.id)}
                                className="flex flex-col items-center gap-1 flex-shrink-0 text-center focus:outline-none active:opacity-70 transition-opacity"
                            >
                                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400">
                                    <div className="bg-white w-full h-full rounded-full flex items-center justify-center border-2 border-white">
                                        {category.id === 'Church' ? <ChurchIcon className="h-6 w-6 text-pink-500" /> : category.id === 'Celebration' ? <CelebrationIcon className="h-6 w-6 text-pink-500"/> : <PartyIcon className="h-6 w-6 text-pink-500"/>}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-900 max-w-[64px] truncate">{category.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

      </div>
    </header>
  );
};

export default Header;
