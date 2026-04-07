import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkle } from 'lucide-react';

export const Particles = ({ mode = 'hearts' }: { mode?: 'hearts' | 'stars' }) => {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (mode === 'stars' ? 3 : 20) + 5,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
    }));
  }, [mode]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p, idx) => (
        <motion.div
          key={`particle-${p.id}-${idx}`}
          initial={{ opacity: 0, y: '110%' }}
          animate={{ 
            opacity: [0, 0.5, 0],
            y: '-10%',
            x: `${p.x + (Math.random() * 10 - 5)}%`
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            fontSize: p.size,
          }}
        >
          {mode === 'hearts' ? (
            <Heart className="text-rose-200/30 fill-rose-200/20" />
          ) : (
            <Sparkle className="text-yellow-200/40 fill-yellow-200/20" />
          )}
        </motion.div>
      ))}
    </div>
  );
};
