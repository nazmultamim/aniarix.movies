'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2 } from 'lucide-react';

export default function AvatarPickerModal({ isOpen, onClose, currentAvatarUrl, onSelect }) {
  const [visible, setVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(currentAvatarUrl || null);
  const [savingId, setSavingId] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedImage(currentAvatarUrl || null);
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen, currentAvatarUrl]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const { style: htmlStyle } = document.documentElement;
    const { style: bodyStyle } = document.body;
    const prevHtml = htmlStyle.overflow;
    const prevBody = bodyStyle.overflow;
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    return () => { htmlStyle.overflow = prevHtml; bodyStyle.overflow = prevBody; };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose?.(), 200);
  }, [onClose]);

  const handlePick = useCallback(async (preset) => {
    setSavingId(preset.id);
    try {
      await onSelect?.(preset.image);
      setSelectedImage(preset.image);
    } finally {
      setSavingId(null);
    }
  }, [onSelect]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
    >
      {/* Background Overlay */}
      <div onClick={handleClose} className="fixed inset-0 bg-black/70 backdrop-blur-md" />

      {/* Centered Modal Container */}
      <div className="fixed inset-0 z-10 flex items-center justify-center px-3 py-3 sm:px-4 sm:py-8 pointer-events-none">
        <div
          className={`relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pointer-events-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] transition-all duration-300 ease-out ${
            visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-[0.98]'
          }`}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-orange-500/20 via-transparent to-transparent opacity-60 blur-sm pointer-events-none" />

          <div className="relative rounded-2xl bg-[#110d0d]/95 border border-white/[0.07] shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)]">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-80" />

            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-5">
              <h2 id="avatar-picker-title" className="text-xl font-display font-black text-white">
                Choose avatar
              </h2>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-muted-foreground hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 sm:px-7 pb-6">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 justify-items-center">
                {AVATAR_PRESETS.map(preset => {
                  const isSelected = selectedImage === preset.image;
                  const isSaving = savingId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePick(preset)}
                      disabled={isSaving}
                      aria-label={`Select ${preset.id} avatar`}
                      className={`group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden transition-all duration-200 ring-2 ${
                        isSelected ? 'ring-orange-400 scale-[1.06]' : 'ring-white/10 hover:ring-orange-400/60'
                      } hover:scale-[1.08] active:scale-95 disabled:cursor-wait`}
                    >
                      <img
                        src={preset.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Hover overlay */}
                      <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />

                      {/* Selected checkmark */}
                      {isSelected && !isSaving && (
                        <span className="absolute inset-0 rounded-full bg-black/35 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" strokeWidth={3} />
                        </span>
                      )}

                      {isSaving && (
                        <span className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-7 py-3 rounded-xl bg-white/90 hover:bg-white text-[#110d0d] font-bold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(modalContent, portalTarget) : modalContent;
}

// Updated Avatar Options Array
export const AVATAR_PRESETS = [
  { id: 'a1', image: 'https://i.pinimg.com/736x/c7/3c/22/c73c22947f5cdb33ece886392b8fea70.jpg' },
  { id: 'a2', image: 'https://i.pinimg.com/736x/78/f1/5b/78f15b6b271790535e7b8ff5bcfef674.jpg' },
  { id: 'a3', image: 'https://i.pinimg.com/1200x/73/da/c3/73dac303d8b0ef8548221866a8166678.jpg' },
  { id: 'a4', image: 'https://i.pinimg.com/736x/1f/76/b9/1f76b98928987324c58cbf317315c144.jpg' },
  { id: 'a5', image: 'https://i.pinimg.com/736x/01/91/e3/0191e39f935e05725470462ff9feaba7.jpg' },
  { id: 'a6', image: 'https://i.pinimg.com/736x/d6/ad/8c/d6ad8c41ac5029c99d65a04931b77724.jpg' },
  { id: 'a7', image: 'https://i.pinimg.com/1200x/1f/3c/08/1f3c088e80ec11df6da1194190dd3ce5.jpg' },
  { id: 'a8', image: 'https://i.pinimg.com/736x/b8/98/e9/b898e9bad69d9d81db6976c41b20733d.jpg' },
  { id: 'a9', image: 'https://i.pinimg.com/1200x/40/e4/f2/40e4f222740a74b3a284a900e3fdeead.jpg' },
  { id: 'a10', image: 'https://i.pinimg.com/736x/22/60/cf/2260cf1c71820d30afc8006c3210edd5.jpg' }
];

export function getPresetById(id) {
  return AVATAR_PRESETS.find(p => p.id === id);
}
