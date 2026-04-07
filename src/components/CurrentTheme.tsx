import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Download, Search, Plus, X } from 'lucide-react';
import { User } from 'firebase/auth';
import { Theme } from '../types';
import { ContributionForm } from './ContributionForm';

export const CurrentTheme = ({ theme, selectedYear, user, onSuccess }: { theme: Theme | undefined, selectedYear: number, user: User | null, onSuccess: () => void }) => {
  const [showForm, setShowForm] = useState(false);
  if (!theme) return (
    <div className="py-12 px-6 bg-rose-50/50 text-center rounded-[40px] border border-rose-100">
      <p className="text-rose-800/40 italic">Aucun thème défini pour l'année {selectedYear}.</p>
      <div className="mt-8">
        <ContributionForm user={user} selectedYear={selectedYear} onSuccess={onSuccess} />
      </div>
    </div>
  );

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-8 bg-rose-50/50 rounded-[40px] border border-rose-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          <div className="inline-block px-3 py-1 bg-sky-100 text-sky-600 rounded-lg text-xs font-bold uppercase tracking-wider">
            Thème {theme.year} - {theme.age} ans
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-rose-900">{theme.title}</h2>
          <p className="text-rose-800/70 leading-relaxed text-sm">
            {theme.description}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            {theme.downloadUrl && (
              <a 
                href={theme.downloadUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-sky-500 text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-100 w-full sm:w-auto"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" /> Télécharger le coloriage
              </a>
            )}
            <a 
              href={`https://www.google.com/search?q=coloriage+${encodeURIComponent(theme.title)}&tbm=isch`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-white text-sky-600 border-2 border-sky-100 rounded-2xl text-xs sm:text-sm font-bold hover:bg-sky-50 transition-all w-full sm:w-auto"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" /> Trouver des coloriages
            </a>
          </div>

          {!showForm ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4"
            >
              <button
                onClick={() => setShowForm(true)}
                className="w-full px-10 py-5 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-3 text-lg group"
              >
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" /> Ajouter un coloriage
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-serif text-rose-900">Ajouter un coloriage</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-rose-50 rounded-full transition-colors">
                  <X className="w-6 h-6 text-rose-400" />
                </button>
              </div>
              <ContributionForm 
                user={user} 
                selectedYear={selectedYear} 
                onSuccess={() => {
                  onSuccess();
                  setShowForm(false);
                }} 
                title="Ajouter un coloriage"
              />
            </motion.div>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="polaroid group"
        >
          <div className="relative aspect-video overflow-hidden mb-4">
            <img 
              src={theme.imageUrl} 
              alt={theme.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-rose-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-rose-900">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Anniversaire de Joy</p>
            <p className="text-lg font-serif italic">6 Mai {theme.year}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
