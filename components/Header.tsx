import React, { useState, useEffect } from 'react';
import { HeartIcon } from './Icons';
import { getProfileImageUrl } from '../services/firebase';
 

interface HeaderProps {
  postCount: number;
}

const Header: React.FC<HeaderProps> = ({ postCount }) => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchImage = async () => {
          setIsLoading(true);
          const url = await getProfileImageUrl();
          setProfileImageUrl(url);
          setIsLoading(false);
      };
      fetchImage();
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center gap-8">
          {/* Foto de perfil estilo Instagram */}
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

          {/* Stats al lado, estilo Instagram */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold">#TheBodorrioGallery</h1>
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