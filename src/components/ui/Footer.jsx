import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-background/60 backdrop-blur-md py-8 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex flex-col items-center justify-center text-center gap-3">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-red-600 shadow-[0_0_10px_rgba(249,115,22,0.4)]">
            <span className="text-[10px] font-black leading-none text-white">AX</span>
          </div>
          <span className="font-display text-lg font-black tracking-tight text-white">
              Ani<span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Arix</span> Movie
          </span>
        </div>

        {/* Disclaimer Text */}
        <p className="max-w-2xl text-xs text-muted-foreground/70 leading-relaxed font-normal">
          AniArix Movie helps you discover movies and TV shows. Availability depends on configured providers.
        </p>

        {/* Copyright */}
        <p className="text-[11px] text-muted-foreground/40 font-medium">
          &copy; {new Date().getFullYear()} AniArix Movie. All rights reserved.
        </p>
        
      </div>
    </footer>
  );
}
