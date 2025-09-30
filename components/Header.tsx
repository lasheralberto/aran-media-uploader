
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
    <header className={`bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col gap-4">
            {/* Row for avatar and KPIs */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={onOpenOptions}
                    className="flex-shrink-0 p-[2px] rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                    aria-label="Opciones de administrador"
                >
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
                </button>

                <div className="flex-grow flex justify-evenly items-center text-center">
                    <div>
                        <span className="font-bold text-lg">{postCount}</span>
                        <p className="text-sm text-gray-500">Posts</p>
                    </div>
                    <div>
                        <span className="font-bold text-lg">150</span>
                        <p className="text-sm text-gray-500">Invitados</p>
                    </div>
                    <div>
                        <span className="font-bold text-lg">1.2k</span>
                        <p className="text-sm text-gray-500">Likes</p>
                    </div>
                     <button 
                        onClick={handleShare}
                        className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label="Compartir galería"
                    >
                        {isCopied ? (
                            <CheckIcon className="h-6 w-6 text-green-600" />
                        ) : (
                            <ShareIcon className="h-6 w-6" />
                        )}
                    </button>
                </div>
            </div>
            
            {/* Column for Bio and other info */}
            <div>
                <h1 className="text-lg font-semibold">#TheBodorrioGallery</h1>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                📸 Sube fotos o quedas fuera del testamento. <br /> 
                💍 #Alberto&Mariona  <br />
                🍾 Baila primero, etiqueta después.
                </p>
            </div>

            {/* Story Bubbles */}
            {categoriesWithContent.length > 0 && (
                <div className="pt-3 border-t border-gray-200 mt-2">
                    <div className="flex items-center gap-4 -mx-4 px-4 overflow-x-auto">
                        {categoriesWithContent.map(category => (
                            <button 
                                key={category.id}
                                onClick={() => onCategoryBubbleClick(category.id)}
                                className="flex flex-col items-center gap-1.5 flex-shrink-0 text-center focus:outline-none"
                            >
                                <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-rose-500">
                                    <div className="bg-white w-full h-full rounded-full flex items-center justify-center">
                                        {category.id === 'Church' ? <ChurchIcon className="h-7 w-7 text-rose-500" /> : category.id === 'Celebration' ? <CelebrationIcon className="h-7 w-7 text-rose-500"/> : <PartyIcon className="h-7 w-7 text-rose-500"/>}
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-gray-600">{category.label}</span>
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
