import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Send, FileText } from 'lucide-react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { compressImageFile, applyWatermark } from '../lib/helpers';
import { handleFirestoreError } from '../lib/firestoreError';
import { OperationType } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

export const ContributionForm = ({ user, selectedYear, onSuccess, title = "Déposer un hommage" }: { user: User | null, selectedYear: number, onSuccess: () => void, title?: string }) => {
  const [authorName, setAuthorName] = useState(user?.displayName || '');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.displayName) {
      setAuthorName(user.displayName);
    }
  }, [user]);

  const getPdfThumbnail = async (pdfDataUrl: string): Promise<string> => {
    try {
      const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error("Canvas context not available");
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await (page as any).render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (error) {
      console.error("Error generating PDF thumbnail:", error);
      throw error;
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdfFile = file.type === 'application/pdf';
      setIsPdf(isPdfFile);
      
      const fileToRead = isPdfFile ? file : await compressImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const result = reader.result as string;
          if (isPdfFile) {
            setPdfData(result);
            const thumbnail = await getPdfThumbnail(result);
            setImage(thumbnail);
          } else {
            const watermarked = await applyWatermark(result, "Souvenir de Joy");
            setImage(watermarked);
            setPdfData(null);
          }
        } catch (error) {
          toast.error("Erreur lors du traitement du fichier.");
        }
      };
      reader.readAsDataURL(fileToRead);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) {
      toast.error("Veuillez entrer votre nom.");
      return;
    }
    if (!image && !pdfData) {
      toast.error("Veuillez ajouter un dessin, un coloriage ou une photo.");
      return;
    }

    setIsSubmitting(true);
    const path = 'contributions';
    try {
      await addDoc(collection(db, path), {
        authorName: authorName.trim(),
        message: message.trim(),
        imageUrl: image || null,
        pdfData: pdfData || null,
        isPdf: isPdf,
        type: (image || pdfData) && message ? 'both' : (image || pdfData) ? 'drawing' : 'message',
        year: selectedYear,
        createdAt: serverTimestamp(),
        uid: user?.uid || 'anonymous'
      });
      
      setMessage('');
      setImage(null);
      setPdfData(null);
      setIsPdf(false);
      onSuccess();
      toast.success("Merci pour votre contribution au cahier d'artistes.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onSubmit={handleSubmit}
      className="bg-white p-6 sm:p-8 md:p-12 rounded-[32px] sm:rounded-[40px] shadow-xl shadow-rose-100/50 border border-rose-50"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <h3 className="text-2xl sm:text-3xl font-serif text-rose-900">{title}</h3>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-rose-900/60 mb-1.5 sm:mb-2">Votre nom</label>
          <input 
            type="text" 
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-rose-50/50 border border-rose-100 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all text-sm sm:text-base"
            placeholder="Ex: Famille Martin"
            required
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-rose-900/60 mb-1.5 sm:mb-2">Votre message ou pensée (optionnel)</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-rose-50/50 border border-rose-100 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all min-h-[120px] sm:min-h-[150px] text-sm sm:text-base"
            placeholder="Écrivez ici votre message pour Joy..."
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-rose-900/60 mb-1.5 sm:mb-2">Dessin, coloriage ou photo (requis, PDF accepté)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative cursor-pointer"
          >
            <div className={cn(
              "w-full aspect-video rounded-2xl sm:rounded-[32px] border-2 sm:border-4 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-rose-50/30",
              image ? "border-rose-500" : "border-rose-100 hover:border-rose-300 hover:bg-rose-50"
            )}>
              {image ? (
                isPdf ? (
                  <div className="flex flex-col items-center gap-2 sm:gap-4">
                    <FileText className="w-10 h-10 sm:w-16 sm:h-16 text-rose-500" />
                    <p className="text-rose-900 font-serif text-sm sm:text-base">Fichier PDF sélectionné</p>
                  </div>
                ) : (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                )
              ) : (
                <>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-rose-400" />
                  </div>
                  <p className="text-rose-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs text-center px-4">Ajouter une image ou un PDF</p>
                </>
              )}
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/jpeg, image/png, image/webp, application/pdf"
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 sm:py-5 bg-rose-500 text-white rounded-xl sm:rounded-[24px] font-bold hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 sm:w-6 sm:h-6" /> Envoyer ma contribution
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
};
