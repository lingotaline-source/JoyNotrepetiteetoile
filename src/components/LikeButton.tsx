import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';

export const LikeButton = ({ count, onLike, className }: { count: number, onLike: () => void, className?: string }) => {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onLike(); }}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all group",
        "bg-rose-50/50 text-rose-400 hover:bg-rose-100 hover:text-rose-600",
        className
      )}
    >
      <Heart className={cn("w-4 h-4 transition-transform group-hover:scale-125", count > 0 && "fill-rose-500 text-rose-500")} />
      <span className="text-xs font-bold">{count}</span>
    </button>
  );
};
