import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, RefreshCw, BookHeart, Globe, Trash2, Heart, LogIn, Plus, Send, MessageSquareHeart } from 'lucide-react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../lib/firestoreError';
import { OperationType, Confidence } from '../types';

export const ConfidenceForm = ({ user, onSuccess }: { user: User | null, onSuccess: () => void }) => {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState(user?.displayName || '');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!user) {
      toast.error("Vous devez être connecté pour écrire une confidence.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'confidences'), {
        authorName: authorName.trim() || "Anonyme",
        content: content.trim(),
        isPublic,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        likesCount: 0
      });
      setContent('');
      toast.success(isPublic ? "Votre confidence a été partagée." : "Votre confidence a été enregistrée en privé.");
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'confidences');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white/60 backdrop-blur-md p-8 rounded-[32px] border border-rose-100 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Votre Nom</label>
          <input 
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Comment souhaitez-vous signer ?"
            className="w-full px-6 py-3 bg-white border border-rose-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Votre message à Joy</label>
          <textarea 
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Écrivez ici vos pensées, vos secrets, vos mots doux..."
            className="w-full px-6 py-4 bg-white border border-rose-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all min-h-[150px] resize-none text-sm"
          />
        </div>
        <div className="flex items-center gap-6 pt-2">
          <button 
            type="button"
            onClick={() => setIsPublic(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
              isPublic ? "bg-rose-500 text-white shadow-md shadow-rose-100" : "bg-rose-50 text-rose-400"
            )}
          >
            <Globe className="w-3 h-3" /> Public
          </button>
          <button 
            type="button"
            onClick={() => setIsPublic(false)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
              !isPublic ? "bg-rose-500 text-white shadow-md shadow-rose-100" : "bg-rose-50 text-rose-400"
            )}
          >
            <Lock className="w-3 h-3" /> Privé
          </button>
        </div>
        <p className="text-[10px] text-rose-300 italic">
          {isPublic 
            ? "Les confidences publiques défilent dans la galerie pour que tout le monde puisse les lire." 
            : "Les confidences privées ne sont visibles que par vous dans votre espace personnel."}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !content.trim()}
        className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Send className="w-5 h-5" /> Confier mon message
          </>
        )}
      </button>
    </form>
  );
};

export const ConfidencesModal = ({ user, isOpen, onClose }: { user: User | null, isOpen: boolean, onClose: () => void }) => {
  const [myConfidences, setMyConfidences] = useState<Confidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;
    const q = query(collection(db, 'confidences'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Confidence));
      setMyConfidences(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'confidences');
    });
    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-rose-50 flex justify-between items-center bg-rose-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-200">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-serif text-rose-900">Mes Confidences Privées</h2>
              <p className="text-xs text-rose-400 font-bold uppercase tracking-widest mt-1">Espace Sacré & Personnel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-rose-100 rounded-full transition-colors text-rose-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-rose-50/10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="w-8 h-8 text-rose-300 animate-spin" />
              <p className="text-rose-300 font-serif italic">Chargement de vos mots doux...</p>
            </div>
          ) : myConfidences.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookHeart className="w-10 h-10 text-rose-200" />
              </div>
              <h3 className="text-xl font-serif text-rose-900 mb-2">Aucune confidence pour le moment</h3>
              <p className="text-rose-800/40 italic max-w-xs mx-auto">
                C'est ici que vos messages privés à Joy seront précieusement conservés.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myConfidences.map((conf) => (
                <motion.div 
                  key={conf.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-white rounded-3xl border border-rose-100 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      {conf.isPublic ? (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-500 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Privé
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-rose-300 font-mono">
                      {conf.createdAt?.toDate ? format(conf.createdAt.toDate(), 'dd/MM/yyyy', { locale: fr }) : '...'}
                    </span>
                  </div>
                  <p className="text-rose-900 italic font-serif leading-relaxed mb-6">
                    "{conf.content}"
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-rose-50">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{conf.authorName}</span>
                    <button 
                      onClick={async () => {
                        if (window.confirm("Supprimer cette confidence ?")) {
                          try {
                            await deleteDoc(doc(db, 'confidences', conf.id));
                            toast.success("Confidence supprimée.");
                          } catch (e) {
                            handleFirestoreError(e, OperationType.DELETE, 'confidences');
                          }
                        }
                      }}
                      className="p-2 text-rose-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const ConfidenceSection = ({ user, onOpenPrivate }: { user: User | null, onOpenPrivate: () => void }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div id="confidences" className="py-24 bg-gradient-to-b from-transparent to-rose-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-600 rounded-full text-xs font-bold uppercase tracking-[0.3em] mb-4">
            <Heart className="w-4 h-4" /> Espace Confidences
          </div>
          <h2 className="text-4xl sm:text-5xl font-serif text-rose-950">Mots doux pour Joy</h2>
          <p className="text-rose-800/50 max-w-2xl mx-auto italic">
            Un espace pour lui confier vos pensées, vos secrets et vos messages d'amour. 
            Choisissez de les partager avec nous ou de les garder dans votre jardin secret.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="relative group">
              <div className="absolute -inset-4 bg-rose-200/20 blur-2xl rounded-full group-hover:bg-rose-300/20 transition-all duration-700" />
              <div className="relative p-10 bg-white rounded-[48px] border border-rose-100 shadow-xl shadow-rose-100/50 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-rose-500 rounded-[24px] shadow-lg shadow-rose-200">
                    <BookHeart className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif text-rose-900">Écrire à Joy</h3>
                    <p className="text-xs text-rose-400 font-bold uppercase tracking-widest mt-1">Laissez une trace de votre amour</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50">
                    <Globe className="w-5 h-5 text-rose-400 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wider">Confidences Publiques</h4>
                      <p className="text-xs text-rose-800/60 leading-relaxed mt-1">
                        Vos mots s'envolent et défilent dans la galerie pour réchauffer les cœurs de tous.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50">
                    <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wider">Confidences Privées</h4>
                      <p className="text-xs text-rose-800/60 leading-relaxed mt-1">
                        Un dialogue intime entre vous et Joy, précieusement gardé dans votre espace personnel.
                      </p>
                    </div>
                  </div>
                </div>

                {!user ? (
                  <div className="pt-4">
                    <button 
                      onClick={() => signInWithPopup(auth, googleProvider)}
                      className="w-full py-5 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-3 text-lg"
                    >
                      <LogIn className="w-6 h-6" /> Se connecter pour écrire
                    </button>
                    <p className="text-[10px] text-center text-rose-300 mt-4 italic">
                      La connexion est nécessaire pour gérer vos confidences privées.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button 
                      onClick={() => setShowForm(!showForm)}
                      className="flex-1 py-5 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-3 text-lg"
                    >
                      <Plus className={cn("w-6 h-6 transition-transform", showForm && "rotate-45")} /> 
                      {showForm ? "Fermer le formulaire" : "Écrire un mot"}
                    </button>
                    <button 
                      onClick={onOpenPrivate}
                      className="px-8 py-5 bg-white text-rose-500 border-2 border-rose-100 rounded-2xl font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-3 text-lg"
                    >
                      <Lock className="w-6 h-6" /> Mon Espace
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {showForm && user ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ConfidenceForm user={user} onSuccess={() => setShowForm(false)} />
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="aspect-square rounded-[48px] bg-white/40 border border-rose-100/50 flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-8 animate-pulse">
                    <MessageSquareHeart className="w-12 h-12 text-rose-200" />
                  </div>
                  <h4 className="text-2xl font-serif text-rose-900 mb-4 italic">"Les mots sont les ailes de l'amour"</h4>
                  <p className="text-rose-800/40 max-w-xs leading-relaxed">
                    Prenez un instant pour confier vos pensées à notre petite étoile.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
