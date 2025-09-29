
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
                <div className="text-2xl font-extrabold tracking-tight">
                    <span className="text-white">Boda de </span>
                    <span className="text-cyan-400">Alberto & Mariona</span>
                </div>
            </div>
             <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
        </header>
    );
};

export default Header;