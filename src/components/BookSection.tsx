import React from 'react';
import { motion } from 'motion/react';
import { Flame, Palette, ChevronRight, Sparkle, Heart, Download } from 'lucide-react';
import { Candle } from '../types';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import { sanitizeForPDF } from '../lib/helpers';

export const BookCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  onClick, 
  spineColor = "bg-rose-400"
}: { 
  title: string, 
  subtitle: string, 
  icon: any, 
  onClick: () => void,
  spineColor?: string
}) => {
  return (
    <motion.button
      whileHover={{ y: -12, rotateY: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative w-full max-w-[320px] aspect-[3/4] perspective-1000 cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-rose-100 rounded-r-3xl rounded-l-md shadow-[20px_20px_50px_rgba(244,63,94,0.15),-5px_0_10px_rgba(0,0,0,0.05)] overflow-hidden border border-rose-100/50 transition-all duration-500 group-hover:shadow-[30px_30px_70px_rgba(244,63,94,0.2)]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none" />
        
        <div className={cn("absolute left-0 top-0 bottom-0 w-10 shadow-[inset_-4px_0_10px_rgba(0,0,0,0.15)] z-20", spineColor)}>
          <div className="absolute inset-y-0 right-0 w-px bg-black/10" />
          <div className="absolute top-8 left-0 right-0 h-1 bg-amber-400/30" />
          <div className="absolute bottom-8 left-0 right-0 h-1 bg-amber-400/30" />
        </div>
        
        <div className="absolute left-14 top-0 bottom-0 w-px bg-amber-200/40" />
        <div className="absolute left-16 top-0 bottom-0 w-px bg-amber-200/20" />
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 pl-16 text-center">
          <div className="mb-10 relative">
             <div className="absolute inset-0 bg-amber-200/30 blur-3xl rounded-full scale-150 animate-pulse" />
             <div className="relative w-20 h-20 rounded-2xl bg-white/60 backdrop-blur-md shadow-inner flex items-center justify-center border border-amber-100/50 group-hover:scale-110 transition-transform duration-700">
               <Icon className="w-10 h-10 text-rose-400 group-hover:text-rose-600 transition-colors duration-500" />
             </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-2xl font-serif italic text-rose-900 tracking-tight leading-tight">
              {title}
            </h3>
            
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-px bg-amber-200/60" />
              <Sparkle className="w-3 h-3 text-amber-400" />
              <div className="w-8 h-px bg-amber-200/60" />
            </div>
            
            <p className="text-rose-800/40 text-[10px] font-bold uppercase tracking-[0.3em] leading-relaxed">
              {subtitle}
            </p>
          </div>
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
             <div className="px-5 py-2 bg-rose-500/10 backdrop-blur-md border border-rose-200 rounded-full">
               <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                 Ouvrir <ChevronRight className="w-3 h-3" />
               </span>
             </div>
          </div>
        </div>
      </div>
      
      <div className="absolute right-[-6px] top-6 bottom-6 w-2 bg-white/90 rounded-r-full shadow-sm z-[-1]" />
      <div className="absolute right-[-12px] top-12 bottom-12 w-2 bg-white/70 rounded-r-full shadow-sm z-[-2]" />
    </motion.button>
  );
};

export const CandleRitual = ({ 
  candles, 
  onOpenModal
}: { 
  candles: Candle[], 
  onOpenModal: () => void
}) => {
  return (
    <BookCard 
      title="Le Jardin des Lumières"
      subtitle={`${candles.length} bougies brillent`}
      icon={Flame}
      onClick={onOpenModal}
      spineColor="bg-amber-400"
    />
  );
};

export const Notebook = ({ 
  onOpenModal
}: { 
  onOpenModal: () => void
}) => {
  return (
    <BookCard 
      title="Cahier des Artistes"
      subtitle="Dessins et messages"
      icon={Palette}
      onClick={onOpenModal}
      spineColor="bg-rose-400"
    />
  );
};

const generateGuidePDF = (type: 'user' | 'admin') => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const margin = 20;
  let currentY = margin;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(225, 29, 72); // rose-600
  
  const title = type === 'user' ? "Guide Utilisateur" : "Guide Administrateur";
  pdf.text(title, pageWidth / 2, currentY, { align: "center" });
  currentY += 10;
  
  pdf.setFontSize(14);
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.text("Joy's Memory Book", pageWidth / 2, currentY, { align: "center" });
  currentY += 20;

  const addSection = (sectionTitle: string, content: string[]) => {
    checkPageBreak(15);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(225, 29, 72);
    pdf.text(sectionTitle, margin, currentY);
    currentY += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(51, 65, 85);
    
    content.forEach(line => {
      const sanitizedLine = sanitizeForPDF(line);
      const splitText = pdf.splitTextToSize(`• ${sanitizedLine}`, pageWidth - (margin * 2) - 5);
      const height = splitText.length * 6 + 2;
      checkPageBreak(height);
      pdf.text(splitText, margin + 5, currentY);
      currentY += height;
    });
    currentY += 8;
  };

  if (type === 'user') {
    addSection("1. Bienvenue", [
      "Ce livre numérique est un espace de recueillement et de souvenirs dédié à Joy.",
      "Il permet à chacun de partager des moments précieux, des dessins, des prières et des mots doux."
    ]);
    addSection("2. Naviguer dans le livre", [
      "Faites défiler la page pour découvrir les photos, dessins, bougies et mots doux.",
      "Cliquez sur une photo ou un dessin (icône loupe) pour l'agrandir en plein écran.",
      "Utilisez les liens rapides en haut de la page pour accéder directement aux bougies ou au cahier des artistes."
    ]);
    addSection("3. Ajouter un souvenir (Dessins et Photos)", [
      "Cliquez sur le bouton '+' (Ajouter un coloriage) dans la section thématique pour partager une création.",
      "Vous pouvez télécharger une image depuis votre appareil ou utiliser l'outil de dessin intégré.",
      "N'oubliez pas d'ajouter votre nom et un petit message si vous le souhaitez."
    ]);
    addSection("4. Le Jardin des Lumières (Bougies)", [
      "Cliquez sur le livre 'Le Jardin des Lumières' en bas de la page pour accéder à l'espace des bougies.",
      "Cliquez sur 'Allumer une bougie' pour laisser une pensée ou une prière.",
      "Votre bougie brillera avec les autres pour honorer la mémoire de Joy."
    ]);
    addSection("5. Le Cahier des Artistes (Contributions)", [
      "Cliquez sur le livre 'Le Cahier des Artistes' pour découvrir tous les messages, dessins et souvenirs partagés.",
      "Ces souvenirs sont organisés par année pour créer un véritable journal de vie."
    ]);
    addSection("6. Interagir avec les souvenirs", [
      "Vous pouvez cliquer sur le cœur sous chaque souvenir pour témoigner de votre affection.",
      "Le nombre de cœurs s'affichera pour montrer tout l'amour porté à chaque souvenir."
    ]);
  } else {
    addSection("1. Accès Administrateur", [
      "Connectez-vous avec votre adresse email autorisée via le bouton de connexion en haut à droite de l'écran.",
      "Une fois connecté, les icônes d'administration apparaîtront dans la barre de navigation en haut."
    ]);
    addSection("2. Gestion des Souvenirs", [
      "Suppression : Vous pouvez supprimer tout contenu inapproprié via l'icône de corbeille rouge.",
      "Rotation des photos : Si une photo est mal orientée, cliquez sur l'icône de rotation (flèches circulaires).",
      "Modification : Vous pouvez modifier le texte des messages ou des bougies en cliquant sur l'icône d'édition (crayon)."
    ]);
    addSection("3. Personnalisation Visuelle (Thèmes)", [
      "Cliquez sur l'icône de palette de couleurs en haut à droite pour accéder au gestionnaire de thèmes.",
      "Vous pouvez modifier les couleurs principales, la police d'écriture et le style global du site."
    ]);
    addSection("4. Paramètres Globaux", [
      "Cliquez sur l'icône d'engrenage en haut à droite pour accéder aux paramètres globaux.",
      "Vous pouvez y modifier le titre du site, ajouter une musique de fond, ou définir un mot de passe global."
    ]);
    addSection("5. Gestion des Bougies", [
      "Cliquez sur l'icône de flamme en haut à droite pour gérer la bibliothèque de bougies disponibles.",
      "Vous pouvez ajouter de nouveaux modèles de bougies ou modifier les existants."
    ]);
    addSection("6. Export PDF", [
      "Cliquez sur le livre 'Le Cahier des Artistes' puis sur le bouton 'Exporter PDF' pour générer un livre souvenir imprimable.",
      "Vous pourrez choisir d'inclure les dessins, les bougies et/ou les mots doux.",
      "Le PDF généré mettra en page élégamment tous les souvenirs sélectionnés."
    ]);
  }

  pdf.save(type === 'user' ? "Joy-Guide-Utilisateur.pdf" : "Joy-Guide-Administrateur.pdf");
};

export const Footer = () => (
  <footer className="py-20 px-6 text-center border-t border-rose-100 bg-white">
    <div className="max-w-4xl mx-auto">
      <Heart className="w-8 h-8 text-rose-500 fill-rose-500 mx-auto mb-6" />
      <h2 className="text-2xl font-serif italic text-rose-900 mb-4">Joy, notre petite étoile 🌟</h2>
      <p className="text-rose-800/50 max-w-md mx-auto mb-12">
        "On apprend à vivre avec l'absence, mais elle continue d'exister à travers nous."
      </p>
      <div className="flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-rose-900/30 mb-12">
        <span>MARIE</span>
        <span>THIERRY</span>
        <span>OWEN</span>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
        <button 
          onClick={() => generateGuidePDF('user')} 
          className="text-rose-500 hover:text-rose-700 flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" /> Guide Utilisateur (PDF)
        </button>
        <button 
          onClick={() => generateGuidePDF('admin')} 
          className="text-rose-500 hover:text-rose-700 flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" /> Guide Administrateur (PDF)
        </button>
      </div>
    </div>
  </footer>
);
