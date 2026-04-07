import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, isLoading }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void, isLoading?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-rose-950/20 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 border border-rose-50 text-center"
      >
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-serif text-rose-900 mb-2">{title}</h3>
        <p className="text-rose-800/60 text-sm mb-8">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-rose-50 text-rose-400 rounded-xl font-bold hover:bg-rose-100 transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
          >
            {isLoading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
