import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, X } from 'lucide-react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../lib/firestoreError';
import { OperationType, Candle, CandleLibraryItem } from '../types';
import { CANDLE_LIBRARY } from '../constants';

export const CandleRitualSection = ({ user, candles, candleLibrary, isAdmin, onDelete, likes, onLike, onSuccess, showCandlesModal, setShowCandlesModal }: { 
  user: User | null, 
  candles: Candle[], 
  candleLibrary: CandleLibraryItem[],
  isAdmin: boolean, 
  onDelete: (id: string, type: 'candle') => void, 
  likes: Record<string, number>, 
  onLike: (id: string) => void,
  onSuccess: () => void,
  showCandlesModal: boolean,
  setShowCandlesModal: (show: boolean) => void
}) => {
  const [prayer, setPrayer] = useState('');
  const [isLighting, setIsLighting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCandle, setSelectedCandle] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [authorName, setAuthorName] = useState(user?.displayName || '');
  const [activeCandleId, setActiveCandleId] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(false);
  const hasInitialAnimated = useRef(false);

  // Set initial selected candle from library if available
  useEffect(() => {
    if (!selectedCandle) {
      if (candleLibrary.length > 0) {
        setSelectedCandle(candleLibrary[0].imageUrl);
      } else if (CANDLE_LIBRARY.length > 0) {
        setSelectedCandle(CANDLE_LIBRARY[0]);
      }
    }
  }, [candleLibrary, selectedCandle]);

  // Update authorName when user changes
  useEffect(() => {
    if (user?.displayName) {
      setAuthorName(user.displayName);
    }
  }, [user]);

  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Animation des bougies une par une quand la section est visible
  useEffect(() => {
    if (isInView && candles.length > 0 && !hasInitialAnimated.current) {
      hasInitialAnimated.current = true;
      setVisibleCount(0);
      const interval = setInterval(() => {
        setVisibleCount(prev => {
          if (prev < candles.length) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 150);
      return () => clearInterval(interval);
    } else if (candles.length > visibleCount) {
      // Si de nouvelles bougies arrivent après l'animation initiale, on les affiche
      setVisibleCount(candles.length);
    }
  }, [candles.length, visibleCount, isInView]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrayer, setEditPrayer] = useState('');

  const handleLightCandle = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = authorName || user?.displayName || 'Anonyme';
    
    setIsLighting(true);
    const path = 'candles';
    try {
      await addDoc(collection(db, path), {
        authorName: finalName,
        prayer,
        candleUrl: selectedCandle,
        year: currentYear,
        createdAt: serverTimestamp(),
        uid: user?.uid || 'anonymous'
      });
      setPrayer('');
      setAuthorName('');
      setShowForm(false);
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsLighting(false);
    }
  };

  const handleDeleteCandle = async (id: string) => {
    onDelete(id, 'candle');
  };

  const handleUpdateCandle = async (id: string) => {
    try {
      await updateDoc(doc(db, 'candles', id), {
        prayer: editPrayer.trim()
      });
      setEditingId(null);
      toast.success("Message de la bougie mis à jour.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'candles');
    }
  };

  const allAvailableCandles = candleLibrary.length > 0 
    ? candleLibrary.map(c => c.imageUrl) 
    : CANDLE_LIBRARY;

  return (
    <>
      <div className="py-12 px-4 sm:px-8 relative bg-rose-50/30 rounded-[40px] border border-rose-100 h-full flex flex-col">
        {/* Particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%" 
              }}
              animate={{ 
                opacity: [0, 0.5, 0],
                y: [null, "-10%"],
                transition: {
                  duration: Math.random() * 5 + 5,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }
              }}
              className="absolute w-1 h-1 bg-amber-400 rounded-full blur-[1px]"
            />
          ))}
        </div>

        <motion.div 
          onViewportEnter={() => setIsInView(true)}
          className="relative z-10 flex-1 flex flex-col"
        >
          <div className="text-center mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 rounded-full text-amber-600 border border-amber-500/20 mb-6"
            >
              <Flame className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest">Rituel de Lumière</span>
            </motion.div>
            
            <h2 className="text-4xl font-serif italic text-rose-900 mb-4">Le Rituel de la Bougie</h2>
            <p className="text-rose-800/60 text-sm leading-relaxed max-w-xl mx-auto">
              Allumez une bougie virtuelle pour Joy. Chaque flamme est une pensée, un souvenir, une prière qui brille avec douceur.
              <button 
                onClick={() => setShowCandlesModal(true)}
                className="ml-2 text-rose-500 font-bold hover:underline"
              >
                Voir le Jardin des Lumières ({candles.length})
              </button>
            </p>
            
            <div className="mt-8 flex flex-col items-center gap-4">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-10 py-4 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 flex items-center gap-3 text-lg group"
                >
                  <Flame className="w-6 h-6 group-hover:animate-bounce" /> Allumer une bougie
                </button>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-2xl bg-white/80 backdrop-blur-md rounded-[40px] shadow-xl p-8 border border-rose-100"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-serif text-rose-900">Allumer une bougie</h3>
                    <button onClick={() => setShowForm(false)} className="p-2 hover:bg-rose-50 rounded-full transition-colors">
                      <X className="w-6 h-6 text-rose-400" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleLightCandle} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-3">Votre nom</label>
                          <input 
                            type="text"
                            value={authorName}
                            onChange={e => setAuthorName(e.target.value)}
                            placeholder={user?.displayName || "Anonyme"}
                            className="w-full px-6 py-4 bg-white border border-rose-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all text-rose-900 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-3">Votre pensée ou prière</label>
                          <textarea 
                            value={prayer}
                            onChange={e => setPrayer(e.target.value)}
                            placeholder="Écrivez un petit mot..."
                            className="w-full px-6 py-4 bg-white border border-rose-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all min-h-[120px] resize-none text-rose-900 shadow-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-3">Choisissez votre bougie</label>
                        <div className="grid grid-cols-2 gap-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                          {allAvailableCandles.map((url, idx) => (
                            <button
                              key={`candle-lib-${idx}`}
                              type="button"
                              onClick={() => setSelectedCandle(url)}
                              className={cn(
                                "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all",
                                selectedCandle === url ? "border-rose-500 ring-4 ring-rose-200 scale-95" : "border-transparent hover:border-rose-200"
                              )}
                            >
                              <img src={url} alt={`Bougie ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              {selectedCandle === url && (
                                <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                                  <div className="bg-white rounded-full p-2 shadow-lg">
                                    <Flame className="w-6 h-6 text-rose-500" />
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLighting}
                      className="w-full py-5 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                    >
                      {isLighting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Allumage...
                        </>
                      ) : (
                        <>
                          <Flame className="w-6 h-6" /> Allumer la bougie
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
