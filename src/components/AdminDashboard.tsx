import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, RefreshCw, Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { Theme, CandleLibraryItem, GlobalSettings, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreError';
import { compressImageFile, applyWatermark } from '../lib/helpers';
import { cn } from '../lib/utils';

export const ThemeManager = ({ themes, onClose }: { themes: Theme[], onClose: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const themeImageInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    title: '',
    description: '',
    imageUrl: '',
    downloadUrl: '',
    age: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'themes';
    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), formData);
        toast.success("Thème mis à jour !");
      } else {
        await addDoc(collection(db, path), formData);
        toast.success("Thème ajouté avec succès !");
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        year: new Date().getFullYear(),
        title: '',
        description: '',
        imageUrl: '',
        downloadUrl: '',
        age: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (theme: Theme) => {
    setFormData({
      year: theme.year,
      title: theme.title,
      description: theme.description,
      imageUrl: theme.imageUrl,
      downloadUrl: theme.downloadUrl || '',
      age: theme.age
    });
    setEditingId(theme.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    const path = 'themes';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success("Thème supprimé");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      toast.error("Erreur lors de la suppression");
    }
  };

  const cleanupDuplicates = async () => {
    const path = 'themes';
    const seen = new Set();
    const duplicates = [];
    
    for (const t of themes) {
      const key = `${t.year}-${t.title}`;
      if (seen.has(key)) {
        duplicates.push(t.id);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length === 0) {
      toast.info("Aucun doublon trouvé");
      return;
    }

    try {
      for (const id of duplicates) {
        await deleteDoc(doc(db, path, id));
      }
      toast.success(`${duplicates.length} doublons supprimés`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      toast.error("Erreur lors du nettoyage");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-rose-950/20 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-rose-50 flex justify-between items-center bg-rose-50/30">
          <h2 className="text-2xl font-serif text-rose-900">Gestion des Thèmes</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={cleanupDuplicates}
              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              title="Nettoyer les doublons"
            >
              <RefreshCw className="w-4 h-4" /> Nettoyer
            </button>
            <button onClick={onClose} className="p-2 hover:bg-rose-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-rose-400" />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {!isAdding ? (
            <div className="space-y-6">
              <button 
                onClick={() => {
                  setIsAdding(true);
                  setEditingId(null);
                  setFormData({
                    year: new Date().getFullYear(),
                    title: '',
                    description: '',
                    imageUrl: '',
                    downloadUrl: '',
                    age: 0
                  });
                }}
                className="w-full py-4 border-2 border-dashed border-rose-200 rounded-2xl text-rose-400 font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Ajouter un nouveau thème
              </button>

              <div className="grid gap-4">
                {[...themes].sort((a, b) => b.year - a.year).map((t, idx) => (
                  <div key={`${t.id}-${idx}`} className="flex items-center gap-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 group">
                    <img src={t.imageUrl} className="w-16 h-16 rounded-xl object-cover" alt="" />
                    <div className="flex-1">
                      <p className="font-bold text-rose-900">{t.year} - {t.title}</p>
                      <p className="text-xs text-rose-400 uppercase tracking-widest">{t.age} ans</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(t)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Année</label>
                  <input 
                    type="number" 
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Âge de Joy</label>
                  <input 
                    type="number" 
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Titre du thème</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                  placeholder="Ex: Gabby et la Maison Magique"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none h-32 resize-none"
                  placeholder="Décrivez l'univers artistique..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Image du thème</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={formData.imageUrl}
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    className="flex-1 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                    placeholder="URL de l'image (https://...) ou charger un fichier"
                    required
                  />
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploading(true);
                        try {
                          const compressedFile = await compressImageFile(file);
                          const reader = new FileReader();
                          const base64 = await new Promise<string>((resolve, reject) => {
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(compressedFile);
                          });
                          const watermarked = await applyWatermark(base64, "Souvenir de Joy");
                          setFormData({...formData, imageUrl: watermarked});
                          toast.success("Image chargée !");
                        } catch (error) {
                          toast.error("Erreur lors du chargement de l'image");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                    ref={themeImageInputRef}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => themeImageInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-3 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-colors disabled:opacity-50"
                    title="Charger une image"
                  >
                    {isUploading ? <div className="w-5 h-5 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Lien de téléchargement (PDF/JPEG)</label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={formData.downloadUrl || ''}
                    onChange={e => setFormData({...formData, downloadUrl: e.target.value})}
                    className="flex-1 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                    placeholder="Lien vers le fichier..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'application/pdf, image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({...formData, downloadUrl: reader.result as string});
                            toast.success("Fichier chargé !");
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="px-4 py-3 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-colors"
                    title="Charger un fichier"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                >
                  {editingId ? "Mettre à jour" : "Enregistrer le thème"}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="px-8 py-4 text-rose-400 font-bold hover:text-rose-600 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AdminDashboard = ({ 
  settings, 
  themes, 
  candleLibrary, 
  onClose, 
  rotations, 
  onRotate 
}: { 
  settings: GlobalSettings | null, 
  themes: Theme[], 
  candleLibrary: CandleLibraryItem[], 
  onClose: () => void, 
  rotations: Record<string, number>, 
  onRotate: (url: string) => void 
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'candles' | 'settings'>('settings');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-rose-950/20 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-rose-50 flex justify-between items-center bg-rose-50/30">
          <h2 className="text-2xl font-serif text-rose-900">Tableau de bord Admin</h2>
          <button onClick={onClose} className="p-2 hover:bg-rose-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-rose-400" />
          </button>
        </div>
        <div className="flex border-b border-rose-100">
          <button onClick={() => setActiveTab('settings')} className={cn("flex-1 py-4 font-bold text-sm transition-colors", activeTab === 'settings' ? "text-rose-600 border-b-2 border-rose-600" : "text-rose-400 hover:text-rose-500")}>Paramètres Globaux</button>
          <button onClick={() => setActiveTab('themes')} className={cn("flex-1 py-4 font-bold text-sm transition-colors", activeTab === 'themes' ? "text-rose-600 border-b-2 border-rose-600" : "text-rose-400 hover:text-rose-500")}>Thèmes</button>
          <button onClick={() => setActiveTab('candles')} className={cn("flex-1 py-4 font-bold text-sm transition-colors", activeTab === 'candles' ? "text-rose-600 border-b-2 border-rose-600" : "text-rose-400 hover:text-rose-500")}>Bougies</button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'settings' && <p>Les paramètres globaux sont gérés dans le composant GlobalSettingsManager.</p>}
          {activeTab === 'themes' && <ThemeManager themes={themes} onClose={() => {}} />}
          {activeTab === 'candles' && <CandleLibraryManager candles={candleLibrary} onClose={() => {}} />}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const CandleLibraryManager = ({ candles, onClose }: { candles: CandleLibraryItem[], onClose: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const compressedFile = await compressImageFile(file);
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile);
      });
      newImages.push(base64);
    }
    setImageFiles(prev => [...prev, ...newImages]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageFiles.length === 0) return;

    setIsSubmitting(true);
    const path = 'candle_library';
    try {
      for (const img of imageFiles) {
        await addDoc(collection(db, path), {
          imageUrl: img,
          createdAt: serverTimestamp()
        });
      }
      toast.success(`${imageFiles.length} bougie(s) ajoutée(s) avec succès`);
      setImageFiles([]);
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error("Erreur lors de l'ajout des bougies");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'candle_library';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success("Bougie supprimée");
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-rose-950/20 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-rose-50 flex justify-between items-center bg-rose-50/30">
          <h2 className="text-2xl font-serif text-rose-900">Bibliothèque de Bougies</h2>
          <button onClick={onClose} className="p-2 hover:bg-rose-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-rose-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {!isAdding ? (
            <div className="space-y-6">
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-4 border-2 border-dashed border-rose-200 rounded-2xl text-rose-400 font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Ajouter de nouvelles bougies
              </button>

              <div className="grid grid-cols-3 gap-4">
                {candles.map((s, idx) => (
                  <div key={`${s.id}-${idx}`} className="group relative aspect-square bg-rose-50/50 rounded-2xl overflow-hidden border border-rose-100">
                    <img src={s.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {confirmDeleteId === s.id ? (
                        <div className="flex flex-col items-center gap-2 p-2">
                          <p className="text-[10px] text-white font-bold uppercase">Supprimer ?</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleDelete(s.id)}
                              className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                            >
                              Oui
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-2 bg-white text-rose-900 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              Non
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="p-3 bg-white text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest">Charger des images de bougies</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-rose-100 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-rose-50 transition-all"
                  >
                    {imageFiles.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 p-4">
                        {imageFiles.map((img, idx) => (
                           <img key={`img-preview-${idx}`} src={img} className="h-24 w-full object-cover rounded-lg" alt="Preview" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-rose-200" />
                        <span className="text-sm text-rose-400">Cliquez pour choisir des bougies</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting || imageFiles.length === 0}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                >
                  {isSubmitting ? "Traitement en cours..." : `Ajouter ${imageFiles.length > 1 ? 'les bougies' : 'la bougie'}`}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setImageFiles([]);
                  }}
                  className="px-8 py-4 text-rose-400 font-bold hover:text-rose-600 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
