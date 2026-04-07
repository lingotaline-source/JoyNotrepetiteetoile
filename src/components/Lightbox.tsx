import React from 'react';
import { motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { LikeButton } from './LikeButton';

export const Lightbox = ({ items, currentIndex, onClose, onPrev, onNext, likes, onLike, rotations, onRotate, isAdmin }: { 
  items: { url: string, id: string }[], 
  currentIndex: number, 
  onClose: () => void, 
  onPrev: () => void, 
  onNext: () => void, 
  likes: Record<string, number>, 
  onLike: (id: string) => void,
  rotations: Record<string, number>,
  onRotate?: (url: string) => void,
  isAdmin?: boolean
}) => {
  const currentItem = items[currentIndex];

  const getImageRotation = (url: string) => rotations[url] || 0;
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
      window.open(url, '_blank');
    }
  };

  return (
    <motion.div 
      key="lightbox"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-[210]"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onPrev}
          className="absolute left-0 md:left-4 p-2 md:p-4 text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full z-[210]"
        >
          <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
        </button>

        <motion.div 
          key={currentItem.id}
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6"
        >
          <div className="relative w-full h-[70vh] md:h-[80vh] flex items-center justify-center">
            <img 
              src={currentItem.url} 
              alt="Zoom" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-500"
              style={{ transform: `rotate(${getImageRotation(currentItem.url)}deg)` }}
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => handleDownload(currentItem.url, `joy-memory-${Date.now()}.jpg`)}
              className="px-6 md:px-10 py-3 md:py-4 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-all flex items-center gap-3 shadow-xl shadow-rose-900/20 text-sm md:text-base"
            >
              <Download className="w-5 h-5 md:w-6 md:h-6" /> Télécharger
            </button>
            <LikeButton 
              count={likes[currentItem.id] || 0}
              onLike={() => onLike(currentItem.id)}
              className="bg-white/10 text-white hover:bg-white/20 hover:text-rose-400 px-6 py-3 md:py-4"
            />
            {isAdmin && onRotate && (
              <button 
                onClick={() => onRotate(currentItem.url)}
                className="p-3 md:p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all flex items-center gap-2"
                title="Faire pivoter"
              >
                <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
            <div className="text-white/60 font-mono text-sm md:text-base tracking-widest">
              {currentIndex + 1} / {items.length}
            </div>
          </div>
        </motion.div>

        <button 
          onClick={onNext}
          className="absolute right-0 md:right-4 p-2 md:p-4 text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full z-[210]"
        >
          <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
        </button>
      </div>
    </motion.div>
  );
};
