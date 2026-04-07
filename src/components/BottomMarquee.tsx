import React, { useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { BookHeart } from 'lucide-react';
import { Contribution, Candle, Confidence } from '../types';
import { MARQUEE_SPEED } from '../constants';
import { Lightbox } from './Lightbox';

export const BottomMarquee = ({ 
  contributions, 
  candles, 
  confidences,
  rotations,
  isAdmin,
  onRotate,
  likes,
  onLike
}: { 
  contributions: Contribution[], 
  candles: Candle[], 
  confidences: Confidence[],
  rotations: Record<string, number>,
  isAdmin: boolean,
  onRotate: (url: string) => void,
  likes: Record<string, number>,
  onLike: (id: string) => void
}) => {
  const mixed = useMemo(() => {
    const userPhotos = contributions.filter(c => c.imageUrl && !c.isPdf).map(c => ({ 
      url: c.imageUrl!, 
      id: c.id,
      message: c.message,
      author: c.authorName,
      type: 'drawing'
    }));
    const candlesImages = candles.filter(c => c.candleUrl).map(c => ({ 
      url: c.candleUrl!, 
      id: c.id,
      message: c.prayer,
      author: c.authorName,
      type: 'candle'
    }));
    const publicConfidences = confidences.filter(c => c.isPublic).map(c => ({
      url: null,
      id: c.id,
      message: c.content,
      author: c.authorName,
      type: 'confidence'
    }));
    
    return [...userPhotos, ...candlesImages, ...publicConfidences].sort(() => Math.random() - 0.5);
  }, [contributions, candles, confidences]);

  const duplicatedMixed = useMemo(() => [...mixed, ...mixed, ...mixed, ...mixed], [mixed]);

  const mixedRef = useRef<HTMLDivElement>(null);
  const [lightboxState, setLightboxState] = useState<{items: any[], index: number} | null>(null);

  useEffect(() => {
    const updateMarquee = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current) {
        const contentWidth = ref.current.scrollWidth / 2;
        ref.current.style.setProperty('--marquee-distance', `-${contentWidth}px`);
        ref.current.style.setProperty('--marquee-duration', `${contentWidth / MARQUEE_SPEED}s`);
      }
    };

    setTimeout(() => updateMarquee(mixedRef), 100);
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateMarquee(mixedRef);
      });
    });
    if (mixedRef.current) observer.observe(mixedRef.current);
    return () => observer.disconnect();
  }, [mixed.length]);

  if (mixed.length === 0) return null;

  return (
    <div className="w-full overflow-hidden py-8 bg-rose-50/20 border-y border-rose-100/30">
      <div className="relative flex overflow-x-hidden group">
        <div ref={mixedRef} className="animate-marquee flex gap-10 sm:gap-16 whitespace-nowrap group-hover:[animation-play-state:paused] items-start py-12">
          {duplicatedMixed.map((item, idx) => (
            <div 
              key={`mixed-${item.id}-${idx}`}
              className="flex flex-col items-center gap-6 p-8 bg-white rounded-[48px] border border-rose-100/50 shadow-[0_12px_50px_rgb(244,63,94,0.1)] min-w-[380px] max-w-[420px] cursor-pointer hover:shadow-[0_20px_60px_rgb(244,63,94,0.15)] transition-all duration-500 hover:-translate-y-3"
              onClick={() => setLightboxState({ items: mixed, index: idx % mixed.length })}
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden rounded-[32px] bg-rose-50/30 flex items-center justify-center p-4">
                {item.url ? (
                  <img 
                    src={item.url} 
                    alt="Coloriage ou Bougie" 
                    className="w-full h-full object-contain rounded-2xl shadow-sm" 
                    style={{ transform: `rotate(${rotations[item.url] || 0}deg)` }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-rose-50 to-white rounded-2xl border border-rose-100/50">
                    <BookHeart className="w-12 h-12 text-rose-200 mb-4" />
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em]">Confidence</span>
                  </div>
                )}
              </div>
              <div className="text-center px-6 w-full pb-2">
                {item.message ? (
                  <p className="text-base text-rose-900 italic line-clamp-3 leading-relaxed mb-4 whitespace-normal font-serif">
                    "{item.message}"
                  </p>
                ) : (
                  <div className="h-4" /> // Petit espace si pas de message
                )}
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-rose-100" />
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-[0.3em]">
                    {item.author}
                  </p>
                  <div className="h-px w-8 bg-rose-100" />
                </div>
              </div>
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
