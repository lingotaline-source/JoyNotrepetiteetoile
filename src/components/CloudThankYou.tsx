import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const CloudThankYou = ({ isVisible }: { isVisible: boolean }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cloud-thank-you"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, y: -50 }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
        >
          <div className="relative flex items-center justify-center w-64 h-32 bg-white/95 rounded-full blur-[1px] shadow-[0_0_40px_rgba(255,255,255,0.8)]">
            <div className="absolute -top-10 left-8 w-24 h-24 bg-white/95 rounded-full"></div>
            <div className="absolute -top-16 right-10 w-32 h-32 bg-white/95 rounded-full"></div>
            <span className="relative z-10 text-5xl font-serif italic text-rose-400 drop-shadow-sm">
              Merci
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
