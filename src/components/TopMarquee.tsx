import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { GlobalSettings } from '../types';
import { JOY_PHOTOS, MARQUEE_SPEED } from '../constants';
import { Lightbox } from './Lightbox';

export const TopMarquee = ({ 
  settings, 
  rotations,
  isAdmin,
  onRotate,
  likes,
  onLike
}: { 
  settings: GlobalSettings | null, 
  rotations: Record<string, number>,
  isAdmin: boolean,
  onRotate: (url: string) => void,
  likes: Record<string, number>,
  onLike: (id: string) => void
}) => {
  const heroUrl = settings?.heroImageUrl || "https://i.postimg.cc/667ZsPjq/PHOTO-2025-04-18-10-46-39.jpg";
  const customPhotos = settings?.marqueePhotos || [];
  const hiddenPhotos = settings?.hiddenMarqueePhotos || [];
  const uniqueCustomPhotos = customPhotos.filter(url => !JOY_PHOTOS.includes(url));
  const basePhotos = [...JOY_PHOTOS, ...uniqueCustomPhotos].filter(url => !hiddenPhotos.includes(url));
  
  const filteredJoyPhotos = basePhotos.filter(url => url !== heroUrl);
  const reorderedJoyPhotos = [heroUrl, ...filteredJoyPhotos].map(url => ({ url, id: url }));
  const duplicatedJoyPhotos = [...reorderedJoyPhotos, ...reorderedJoyPhotos, ...reorderedJoyPhotos];

  const joyRef = useRef<HTMLDivElement>(null);
  const [lightboxState, setLightboxState] = useState<{items: {url: string, id: string}[], index: number} | null>(null);

  useEffect(() => {
    const updateMarquee = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current) {
        const contentWidth = ref.current.scrollWidth / 2;
        ref.current.style.setProperty('--marquee-distance', `-${contentWidth}px`);
        ref.current.style.setProperty('--marquee-duration', `${contentWidth / MARQUEE_SPEED}s`);
      }
    };

    setTimeout(() => updateMarquee(joyRef), 100);
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateMarquee(joyRef);
      });
    });
    if (joyRef.current) observer.observe(joyRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full overflow-hidden py-4 bg-white/30 border-b border-rose-100/20">
      <div className="relative flex overflow-x-hidden group">
        <div ref={joyRef} className="animate-marquee flex gap-3 sm:gap-4 whitespace-nowrap group-hover:[animation-play-state:paused] py-2">
          {duplicatedJoyPhotos.map((item, idx) => (
            <div 
              key={`joy-${item.id}-${idx}`}
              className="relative h-32 sm:h-40 md:h-48 shrink-0 cursor-pointer hover:opacity-90 transition-all"
              onClick={() => setLightboxState({ items: reorderedJoyPhotos, index: idx % reorderedJoyPhotos.length })}
            >
              <img 
                src={item.url} 
                alt="Joy" 
                className="h-full w-auto object-contain rounded-2xl shadow-sm border border-rose-100" 
                style={{ transform: `rotate(${rotations[item.url] || 0}deg)` }}
              />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightboxState !== null && (
          <Lightbox
            items={lightboxState.items}
            currentIndex={lightboxState.index}
            onClose={() => setLightboxState(null)}
            onPrev={() => setLightboxState(prev => prev ? { ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length } : null)}
            onNext={() => setLightboxState(prev => prev ? { ...prev, index: (prev.index + 1) % prev.items.length } : null)}
            likes={likes}
            onLike={onLike}
            rotations={rotations}
            onRotate={onRotate}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
