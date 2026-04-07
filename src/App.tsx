import { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using a more robust method for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  getDocFromServer,
  getDocs,
  where,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  setDoc,
  limit,
  startAfter
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { ADMIN_EMAILS, CANDLE_LIBRARY } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { 
  Heart, 
  Cloud, 
  Sparkles, 
  Plus, 
  Image as ImageIcon, 
  Send, 
  LogOut, 
  Flame, 
  Palette, 
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  AlertCircle,
  Folder,
  Download,
  Lock,
  Calendar as CalendarIcon,
  Settings,
  Edit2,
  Trash2,
  Camera,
  RefreshCw,
  Search,
  BookOpen,
  Music,
  Moon,
  Sun,
  FileText,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkle,
  FolderOpen,
  BookHeart,
  Globe,
  LogIn,
  MessageSquareHeart,
  ImagePlus,
  Info,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from './lib/utils';
import { AdminDashboard } from './components/AdminDashboard';
import imageCompression from 'browser-image-compression';
import confetti from 'canvas-confetti';

const googleProvider = new GoogleAuthProvider();

const compressImageFile = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Compression error:", error);
    return file; // Fallback to original
  }
};

// --- Constants ---
const LikeButton = ({ count, onLike, className }: { count: number, onLike: () => void, className?: string }) => {
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

// --- Types ---
interface Contribution {
  id: string;
  authorName: string;
  message?: string;
  imageUrl?: string;
  pdfData?: string;
  isPdf?: boolean;
  candleUrl?: string;
  type: 'drawing' | 'message' | 'both' | 'candle';
  year: number;
  createdAt: any;
  uid: string;
  likesCount?: number;
}

interface Candle {
  id: string;
  authorName: string;
  prayer?: string;
  candleUrl?: string;
  year: number;
  createdAt: any;
  uid: string;
  likesCount?: number;
}

interface Confidence {
  id: string;
  authorName: string;
  content: string;
  isPublic: boolean;
  authorId: string;
  createdAt: any;
  likesCount?: number;
}

interface Theme {
  id: string;
  year: number;
  title: string;
  description: string;
  imageUrl: string;
  downloadUrl?: string;
  age: number;
}

interface CandleLibraryItem {
  id: string;
  imageUrl: string;
  createdAt: any;
}

interface GlobalSettings {
  id: string;
  heroImageUrl: string;
  heroDescription: string;
  showHeroBadge: boolean;
  sitePassword?: string;
  backgroundMusicUrl?: string;
  enableParticles?: boolean;
  enableNightMode?: boolean;
  marqueePhotos?: string[];
  hiddenMarqueePhotos?: string[];
  adminEmails?: string[];
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// --- Error Handling ---

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Une erreur inattendue est survenue.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error) errorMessage = `Erreur Firebase: ${parsed.error}`;
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
          <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
            <h2 className="text-2xl font-serif text-rose-900 mb-4">Oups ! Quelque chose s'est mal passé</h2>
            <p className="text-rose-800/60 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-rose-500 text-white px-8 py-3 rounded-full font-bold hover:bg-rose-600 transition-all"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Utilities ---
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to convert URL to base64", e);
    return url; // Fallback to original URL
  }
};

const applyWatermark = async (base64: string, text: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      
      // Calculate new dimensions (max 1200px)
      const MAX_SIZE = 1200;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const fontSize = Math.max(20, width / 30);
      ctx.font = `italic ${fontSize}px "Libre Baskerville", serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillText(text, width - 20, height - 20);
      
      // Compress to ensure it's under ~800KB base64 (which is ~600KB binary)
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Rough estimation: 1 character in base64 is 1 byte. 800KB = 800,000 bytes.
      while (dataUrl.length > 800000 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      
      resolve(dataUrl);
    };
    img.onerror = () => {
      // If the image fails to load (e.g., unsupported format like HEIC without transcoding),
      // we resolve with the original base64, but it might fail later.
      resolve(base64);
    };
    img.src = base64;
  });
};

// --- Particles Component ---
const Particles = ({ mode = 'hearts' }: { mode?: 'hearts' | 'stars' }) => {
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

// --- Components ---

const Header = ({ user, onLogin, onLogout, onToggleAdmin, onRefresh, isLoading, isAdmin }: { 
  user: User | null, 
  onLogin: () => void, 
  onLogout: () => void, 
  onToggleAdmin: () => void, 
  onRefresh: () => void,
  isLoading: boolean,
  isAdmin: boolean
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
          <Heart className="text-rose-500 fill-rose-500 w-4 h-4 sm:w-6 sm:h-6" />
        </div>
        <h1 className="text-lg sm:text-xl font-serif italic text-rose-900 text-center sm:text-left">Joy, notre petite étoile</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all",
            isLoading && "animate-spin"
          )}
          title="Actualiser les données"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            {isAdmin && (
              <button 
                onClick={onToggleAdmin}
                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all flex items-center gap-2"
                title="Tableau de Bord Admin"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Admin</span>
              </button>
            )}
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-rose-200" referrerPolicy="no-referrer" />
            <button 
              onClick={onLogout}
              className="text-rose-600 hover:text-rose-800 transition-colors p-2 rounded-full hover:bg-rose-50"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="bg-rose-500 text-white px-4 py-2 rounded-full font-medium hover:bg-rose-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm sm:text-base"
          >
            Se connecter
          </button>
        )}
      </div>
    </header>
  );
};

const JOY_PHOTOS = [
  "https://i.postimg.cc/5Hx9vLbf/PHOTO-2025-04-18-09-33-42(1).jpg",
  "https://i.postimg.cc/ns0F1rhY/PHOTO-2025-04-18-09-39-42.jpg",
  "https://i.postimg.cc/FfDrxzHx/PHOTO-2025-04-18-09-44-30.jpg",
  "https://i.postimg.cc/1gJmKX3r/PHOTO-2025-04-18-09-44-30(2).jpg",
  "https://i.postimg.cc/JyPrQ0zP/PHOTO-2025-04-18-09-44-31.jpg",
  "https://i.postimg.cc/LqN9V58x/PHOTO-2025-04-18-09-44-31(1).jpg",
  "https://i.postimg.cc/xktfP81s/PHOTO-2025-04-18-09-46-49.jpg",
  "https://i.postimg.cc/1gJmKX3Y/PHOTO-2025-04-18-09-47-58.jpg",
  "https://i.postimg.cc/jWZxh2SB/PHOTO-2025-04-18-09-47-59.jpg",
  "https://i.postimg.cc/Y4brx0CV/PHOTO-2025-04-18-09-47-59(1).jpg",
  "https://i.postimg.cc/XZQjgqYP/PHOTO-2025-04-18-09-47-59(2).jpg",
  "https://i.postimg.cc/Mcd6YHpN/PHOTO-2025-04-18-09-48-00(1).jpg",
  "https://i.postimg.cc/S2Ry14nt/PHOTO-2025-04-18-09-48-01.jpg",
  "https://i.postimg.cc/7Ghxt45K/PHOTO-2025-04-18-09-48-01(1).jpg",
  "https://i.postimg.cc/34NKfhyQ/PHOTO-2025-04-18-09-50-05.jpg",
  "https://i.postimg.cc/phr2cvm7/PHOTO-2025-04-18-09-50-05(1).jpg",
  "https://i.postimg.cc/XGqV1Wrt/PHOTO-2025-04-18-09-50-05(2).jpg",
  "https://i.postimg.cc/CB5Fr0ZT/PHOTO-2025-04-18-09-50-05(3).jpg",
  "https://i.postimg.cc/ygxVpKJB/PHOTO-2025-04-18-09-50-06.jpg",
  "https://i.postimg.cc/ftywqs3s/PHOTO-2025-04-18-09-50-07.jpg",
  "https://i.postimg.cc/R6hMpm3C/PHOTO-2025-04-18-09-50-08.jpg",
  "https://i.postimg.cc/G8tcgRBc/PHOTO-2025-04-18-09-50-08(1).jpg",
  "https://i.postimg.cc/cgCskWKC/PHOTO-2025-04-18-09-58-05.jpg",
  "https://i.postimg.cc/667ZsPjq/PHOTO-2025-04-18-10-46-39.jpg",
  "https://i.postimg.cc/mzkbp4cD/PHOTO-2025-04-18-09-58-05(2).jpg",
  "https://i.postimg.cc/r0s8ZTdD/PHOTO-2025-04-18-09-58-06.jpg",
  "https://i.postimg.cc/ftPM6PXx/PHOTO-2025-04-18-10-21-50.jpg",
  "https://i.postimg.cc/CB2wW2Dk/PHOTO-2025-04-18-10-21-50(1).jpg",
  "https://i.postimg.cc/njWn6W7G/PHOTO-2025-04-18-10-21-51.jpg",
  "https://i.postimg.cc/WFysQyr0/PHOTO-2025-04-18-10-21-51(1).jpg",
  "https://i.postimg.cc/bD5qK5bx/PHOTO-2025-04-18-10-21-51(2).jpg",
  "https://i.postimg.cc/bD5qK5bg/PHOTO-2025-04-18-10-21-52.jpg",
  "https://i.postimg.cc/470Xr0t5/PHOTO-2025-04-18-10-21-52(1).jpg",
  "https://i.postimg.cc/WFysQyr7/PHOTO-2025-04-18-10-21-52(2).jpg",
  "https://i.postimg.cc/sGZ3yJ9p/PHOTO-2025-04-18-10-21-53.jpg",
  "https://i.postimg.cc/QKWjsqk5/PHOTO-2025-04-18-10-21-53(1).jpg",
  "https://i.postimg.cc/n9QnZ1YB/PHOTO-2025-04-18-10-21-53(2).jpg",
  "https://i.postimg.cc/xNb9YPyP/PHOTO-2025-04-18-10-21-54.jpg",
  "https://i.postimg.cc/kRt79yFW/PHOTO-2025-04-18-10-21-54(1).jpg",
  "https://i.postimg.cc/RJnv9TQQ/PHOTO-2025-04-18-10-21-54(2).jpg",
  "https://i.postimg.cc/XByn3gck/PHOTO-2025-04-18-10-21-54(3).jpg",
  "https://i.postimg.cc/kRt79yFw/PHOTO-2025-04-18-10-21-55.jpg",
  "https://i.postimg.cc/30D37ZCB/PHOTO-2025-04-18-10-21-55(1).jpg",
  "https://i.postimg.cc/fk3zxwnL/PHOTO-2025-04-18-10-45-55.jpg",
  "https://i.postimg.cc/fS0MZvfD/PHOTO-2025-04-18-10-45-56(1).jpg",
  "https://i.postimg.cc/PNLXmtsJ/PHOTO-2025-04-18-10-45-56(2).jpg",
  "https://i.postimg.cc/Z09brTtW/PHOTO-2025-04-18-10-45-56(3).jpg",
  "https://i.postimg.cc/DmWvq2ks/PHOTO-2025-04-18-10-45-57.jpg",
  "https://i.postimg.cc/bdGyQzcS/PHOTO-2025-04-18-10-45-57(1).jpg",
  "https://i.postimg.cc/XXZjwVSC/PHOTO-2025-04-18-10-45-57(2).jpg",
  "https://i.postimg.cc/mhcLQbfQ/PHOTO-2025-04-18-10-45-58.jpg",
  "https://i.postimg.cc/XXZjwVSk/PHOTO-2025-04-18-10-45-59.jpg",
  "https://i.postimg.cc/t71qhXQF/PHOTO-2025-04-18-10-45-59(1).jpg",
  "https://i.postimg.cc/dD7s8qPm/PHOTO-2025-04-18-10-45-59(3).jpg",
  "https://i.postimg.cc/MXc6yW2t/PHOTO-2025-04-18-10-46-00.jpg",
  "https://i.postimg.cc/dD7s8qPH/PHOTO-2025-04-18-10-46-01.jpg",
  "https://i.postimg.cc/bdGyQzcg/PHOTO-2025-04-18-10-46-01(1).jpg",
  "https://i.postimg.cc/rzdVS8XQ/PHOTO-2025-04-18-10-46-01(2).jpg",
  "https://i.postimg.cc/QVB8pXGf/PHOTO-2025-04-18-10-46-01(3).jpg",
  "https://i.postimg.cc/DmWvq2kH/PHOTO-2025-04-18-10-46-02.jpg",
  "https://i.postimg.cc/xqkfK0DF/PHOTO-2025-04-18-10-46-02(1).jpg",
  "https://i.postimg.cc/Z01TH147/PHOTO-2025-04-18-10-46-03.jpg",
  "https://i.postimg.cc/Hjfpzfd2/PHOTO-2025-04-18-10-46-03(1).jpg",
  "https://i.postimg.cc/c6VshV0D/PHOTO-2025-04-18-10-46-03(2).jpg",
  "https://i.postimg.cc/hhHSsHcZ/PHOTO-2025-04-18-10-46-03(3).jpg",
  "https://i.postimg.cc/7bpx9pwj/PHOTO-2025-04-18-10-46-04.jpg",
  "https://i.postimg.cc/9zvWbvCK/PHOTO-2025-04-18-10-46-04(2).jpg",
  "https://i.postimg.cc/fk6wC6DG/PHOTO-2025-04-18-10-46-22(1).jpg",
  "https://i.postimg.cc/w3S62S9B/PHOTO-2025-04-18-10-46-35.jpg",
  "https://i.postimg.cc/K4dZfdmZ/PHOTO-2025-04-18-10-46-35(1).jpg",
  "https://i.postimg.cc/2VhCK25Y/PHOTO-2025-04-18-10-46-36.jpg",
  "https://i.postimg.cc/YhYtsbSH/PHOTO-2025-04-18-10-46-36(1).jpg",
  "https://i.postimg.cc/jLPRFZjd/PHOTO-2025-04-18-10-46-37.jpg",
  "https://i.postimg.cc/kBK7pf57/PHOTO-2025-04-18-10-46-37(1).jpg",
  "https://i.postimg.cc/2VhCK251/PHOTO-2025-04-18-10-46-38.jpg",
  "https://i.postimg.cc/ykc7bvNN/PHOTO-2025-04-18-10-46-38(1).jpg",
  "https://i.postimg.cc/tYW9M2gT/PHOTO-2025-04-18-10-46-38(3).jpg",
  "https://i.postimg.cc/RNKvDX03/PHOTO-2025-04-18-10-46-39.jpg",
  "https://i.postimg.cc/LnLmbNsn/PHOTO-2025-04-18-10-46-39(1).jpg",
  "https://i.postimg.cc/PPYdR2q1/PHOTO-2025-04-18-10-46-40.jpg",
  "https://i.postimg.cc/KRBmHJYL/PHOTO-2025-04-18-10-46-40(1).jpg",
  "https://i.postimg.cc/rKxqPQp4/PHOTO-2025-04-18-10-46-40(2).jpg",
  "https://i.postimg.cc/1fwyjJzw/PHOTO-2025-04-18-10-46-40(3).jpg",
  "https://i.postimg.cc/3dm3cnwF/PHOTO-2025-04-18-10-46-41.jpg",
  "https://i.postimg.cc/56LfRntq/PHOTO-2025-04-18-10-46-41(1).jpg",
  "https://i.postimg.cc/fJmMrBb7/PHOTO-2025-04-18-10-46-41(2).jpg",
  "https://i.postimg.cc/WdVsLgDM/PHOTO-2025-04-18-10-46-42.jpg",
  "https://i.postimg.cc/5XJfdLHY/PHOTO-2025-04-18-10-46-42(1).jpg",
  "https://i.postimg.cc/K1bmSBKL/PHOTO-2025-04-18-10-46-42(2).jpg",
  "https://i.postimg.cc/18SyhwgD/PHOTO-2025-04-18-10-46-42(3).jpg",
  "https://i.postimg.cc/QFDjG1Bk/PHOTO-2025-04-18-10-46-43.jpg",
  "https://i.postimg.cc/HrmTDXJ2/PHOTO-2025-04-18-11-09-23.jpg",
  "https://i.postimg.cc/XrWnSdZg/PHOTO-2025-04-18-11-09-23(1).jpg",
  "https://i.postimg.cc/ZWmJtp9j/PHOTO-2025-04-18-11-11-26.jpg",
  "https://i.postimg.cc/3kh35myn/PHOTO-2025-04-18-11-11-30.jpg",
  "https://i.postimg.cc/WdVsLgDY/PHOTO-2025-04-18-11-11-59.jpg",
  "https://i.postimg.cc/CR0wTkZc/PHOTO-2025-04-18-11-12-01.jpg",
  "https://i.postimg.cc/k2C73KV1/PHOTO-2025-04-18-11-12-10.jpg",
  "https://i.postimg.cc/K1bmSBK9/PHOTO-2025-04-18-11-12-14.jpg",
  "https://i.postimg.cc/DSh7kLWM/PHOTO-2025-04-18-11-12-20.jpg",
  "https://i.postimg.cc/fVsMnm3p/PHOTO-2025-04-18-11-12-25.jpg",
  "https://i.postimg.cc/HrmTDXJN/PHOTO-2025-04-18-11-12-32.jpg",
  "https://i.postimg.cc/Sn4mFCXH/PHOTO-2025-04-18-11-12-35.jpg",
  "https://i.postimg.cc/xXQ9DMJV/PHOTO-2025-04-18-11-12-39.jpg",
  "https://i.postimg.cc/v4yGFfgF/PHOTO-2025-04-18-11-12-43.jpg",
  "https://i.postimg.cc/sMJsVxSn/PHOTO-2025-04-18-11-12-49.jpg",
  "https://i.postimg.cc/JsQM10JF/PHOTO-2025-04-18-11-12-50.jpg",
  "https://i.postimg.cc/w1kg6MJ4/PHOTO-2025-04-18-11-12-50(1).jpg",
  "https://i.postimg.cc/sMJsVxSb/PHOTO-2025-04-18-11-12-51.jpg",
  "https://i.postimg.cc/21xrzyvJ/PHOTO-2025-04-18-11-12-53.jpg",
  "https://i.postimg.cc/NKxBgFTS/PHOTO-2025-04-18-11-12-54.jpg",
  "https://i.postimg.cc/rD9M8sxk/PHOTO-2025-04-18-11-12-55.jpg",
  "https://i.postimg.cc/TKcfR1gx/PHOTO-2025-04-18-11-12-56.jpg",
  "https://i.postimg.cc/ZWL4TnpZ/PHOTO-2025-04-18-11-12-57.jpg",
  "https://i.postimg.cc/tszpXJWp/PHOTO-2025-04-18-11-12-58.jpg",
  "https://i.postimg.cc/mPSBbkCt/PHOTO-2025-04-18-11-13-01.jpg",
  "https://i.postimg.cc/Lq6RhS3s/PHOTO-2025-04-18-11-13-04.jpg",
  "https://i.postimg.cc/RWT4MhKW/PHOTO-2025-04-18-11-13-04(1).jpg",
  "https://i.postimg.cc/Y4qkj7zh/PHOTO-2025-04-18-11-13-05.jpg",
  "https://i.postimg.cc/SXNqj4fj/PHOTO-2025-04-18-11-13-05(1).jpg",
  "https://i.postimg.cc/B8Qst3B8/PHOTO-2025-04-18-11-13-06.jpg",
  "https://i.postimg.cc/4KNZnGQp/PHOTO-2025-04-18-11-13-07.jpg",
  "https://i.postimg.cc/XZ73XWkw/PHOTO-2025-04-18-11-13-08.jpg",
  "https://i.postimg.cc/gwkdrpHs/PHOTO-2025-04-18-11-13-09.jpg",
  "https://i.postimg.cc/R3V9qmL1/PHOTO-2025-04-18-11-19-00(1).jpg",
  "https://i.postimg.cc/VSGwChKq/PHOTO-2025-04-18-11-19-01(1).jpg",
  "https://i.postimg.cc/7Cs42RKM/PHOTO-2025-04-18-11-19-01(2).jpg",
  "https://i.postimg.cc/wtfzmrwV/PHOTO-2025-04-18-11-19-01(3).jpg",
  "https://i.postimg.cc/cK9WnzFk/PHOTO-2025-04-18-11-19-02.jpg",
  "https://i.postimg.cc/t1SbxcB2/PHOTO-2025-04-18-11-19-02(1).jpg",
  "https://i.postimg.cc/1gCSqdvj/PHOTO-2025-04-18-11-25-00.jpg",
  "https://i.postimg.cc/GB7RyfX7/PHOTO-2025-04-18-11-25-00(1).jpg",
  "https://i.postimg.cc/QB4DTzfP/PHOTO-2025-04-18-11-25-01.jpg",
  "https://i.postimg.cc/XZHWCPsT/PHOTO-2025-04-18-11-25-02.jpg",
  "https://i.postimg.cc/R3smHYgy/PHOTO-2025-04-18-11-25-02(1).jpg",
  "https://i.postimg.cc/QB4DTz63/PHOTO-2025-04-18-11-25-03.jpg",
  "https://i.postimg.cc/94827kxH/PHOTO-2025-04-18-11-25-03(1).jpg",
  "https://i.postimg.cc/rdnTrHhT/PHOTO-2025-04-18-11-25-19.jpg",
  "https://i.postimg.cc/0MzsdC43/PHOTO-2025-04-18-11-25-21.jpg",
  "https://i.postimg.cc/YGvHfxPZ/PHOTO-2025-04-18-11-25-22.jpg"
];

const MARQUEE_SPEED = 25; // pixels per second

const Lightbox = ({ items, currentIndex, onClose, onPrev, onNext, likes, onLike, rotations, onRotate, isAdmin }: { 
  items: { url: string, id: string }[], 
  currentIndex: number, 
  onClose: () => void, 
  onPrev: () => void, 
  onNext: () => void, 
  likes: Record<string, number>, 
  onLike: (id: string) => void,
  rotations: Record<string, number>,
  onRotate?: (url: string) => void,
  isAdmin?: boolean
}) => {
  const currentItem = items[currentIndex];

  const getImageRotation = (url: string) => rotations[url] || 0;
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
      window.open(url, '_blank');
    }
  };

  return (
    <motion.div 
      key="lightbox"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-[210]"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onPrev}
          className="absolute left-0 md:left-4 p-2 md:p-4 text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full z-[210]"
        >
          <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
        </button>

        <motion.div 
          key={currentItem.id}
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6"
        >
          <div className="relative w-full h-[70vh] md:h-[80vh] flex items-center justify-center">
            <img 
              src={currentItem.url} 
              alt="Zoom" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-500"
              style={{ transform: `rotate(${getImageRotation(currentItem.url)}deg)` }}
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => handleDownload(currentItem.url, `joy-memory-${Date.now()}.jpg`)}
              className="px-6 md:px-10 py-3 md:py-4 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-all flex items-center gap-3 shadow-xl shadow-rose-900/20 text-sm md:text-base"
            >
              <Download className="w-5 h-5 md:w-6 md:h-6" /> Télécharger
            </button>
            <LikeButton 
              count={likes[currentItem.id] || 0}
              onLike={() => onLike(currentItem.id)}
              className="bg-white/10 text-white hover:bg-white/20 hover:text-rose-400 px-6 py-3 md:py-4"
            />
            {isAdmin && onRotate && (
              <button 
                onClick={() => onRotate(currentItem.url)}
                className="p-3 md:p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all flex items-center gap-2"
                title="Faire pivoter"
              >
                <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
            <div className="text-white/60 font-mono text-sm md:text-base tracking-widest">
              {currentIndex + 1} / {items.length}
            </div>
          </div>
        </motion.div>

        <button 
          onClick={onNext}
          className="absolute right-0 md:right-4 p-2 md:p-4 text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full z-[210]"
        >
          <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
        </button>
      </div>
    </motion.div>
  );
};

const CloudThankYou = ({ isVisible }: { isVisible: boolean }) => {
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

const TopMarquee = ({ 
  settings, 
  rotations,
  isAdmin,
  onRotate,
  likes,
  onLike
}: { 
  settings: GlobalSettings | null, 
  rotations: Record<string, number>,
  isAdmin: boolean,
  onRotate: (url: string) => void,
  likes: Record<string, number>,
  onLike: (id: string) => void
}) => {
  const heroUrl = settings?.heroImageUrl || "https://i.postimg.cc/667ZsPjq/PHOTO-2025-04-18-10-46-39.jpg";
  const customPhotos = settings?.marqueePhotos || [];
  const hiddenPhotos = settings?.hiddenMarqueePhotos || [];
  const uniqueCustomPhotos = customPhotos.filter(url => !JOY_PHOTOS.includes(url));
  const basePhotos = [...JOY_PHOTOS, ...uniqueCustomPhotos].filter(url => !hiddenPhotos.includes(url));
  
  const filteredJoyPhotos = basePhotos.filter(url => url !== heroUrl);
  const reorderedJoyPhotos = [heroUrl, ...filteredJoyPhotos].map(url => ({ url, id: url }));
  const duplicatedJoyPhotos = [...reorderedJoyPhotos, ...reorderedJoyPhotos, ...reorderedJoyPhotos];

  const joyRef = useRef<HTMLDivElement>(null);
  const [lightboxState, setLightboxState] = useState<{items: {url: string, id: string}[], index: number} | null>(null);

  useEffect(() => {
    const updateMarquee = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current) {
        const contentWidth = ref.current.scrollWidth / 2;
        ref.current.style.setProperty('--marquee-distance', `-${contentWidth}px`);
        ref.current.style.setProperty('--marquee-duration', `${contentWidth / MARQUEE_SPEED}s`);
      }
    };

    setTimeout(() => updateMarquee(joyRef), 100);
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateMarquee(joyRef);
      });
    });
    if (joyRef.current) observer.observe(joyRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full overflow-hidden py-4 bg-white/30 border-b border-rose-100/20">
      <div className="relative flex overflow-x-hidden group">
        <div ref={joyRef} className="animate-marquee flex gap-3 sm:gap-4 whitespace-nowrap group-hover:[animation-play-state:paused] py-2">
          {duplicatedJoyPhotos.map((item, idx) => (
            <div 
              key={`joy-${item.id}-${idx}`}
              className="relative h-32 sm:h-40 md:h-48 shrink-0 cursor-pointer hover:opacity-90 transition-all"
              onClick={() => setLightboxState({ items: reorderedJoyPhotos, index: idx % reorderedJoyPhotos.length })}
            >
              <img 
                src={item.url} 
                alt="Joy" 
                className="h-full w-auto object-contain rounded-2xl shadow-sm border border-rose-100" 
                style={{ transform: `rotate(${rotations[item.url] || 0}deg)` }}
              />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightboxState !== null && (
          <Lightbox
            items={lightboxState.items}
            currentIndex={lightboxState.index}
            onClose={() => setLightboxState(null)}
            onPrev={() => setLightboxState(prev => prev ? { ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length } : null)}
            onNext={() => setLightboxState(prev => prev ? { ...prev, index: (prev.index + 1) % prev.items.length } : null)}
            likes={likes}
            onLike={onLike}
            rotations={rotations}
            onRotate={onRotate}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const BottomMarquee = ({ 
  contributions, 
  candles, 
  confidences,
  rotations,
  isAdmin,
  onRotate,
  likes,
  onLike
}: { 
  contributions: Contribution[], 
  candles: Candle[], 
  confidences: Confidence[],
  rotations: Record<string, number>,
  isAdmin: boolean,
  onRotate: (url: string) => void,
  likes: Record<string, number>,
  onLike: (id: string) => void
}) => {
  const mixed = useMemo(() => {
    const userPhotos = contributions.filter(c => c.imageUrl && !c.isPdf).map(c => ({ 
      url: c.imageUrl!, 
      id: c.id,
      message: c.message,
      author: c.authorName,
      type: 'drawing'
    }));
    const candlesImages = candles.filter(c => c.candleUrl).map(c => ({ 
      url: c.candleUrl!, 
      id: c.id,
      message: c.prayer,
      author: c.authorName,
      type: 'candle'
    }));
    const publicConfidences = confidences.filter(c => c.isPublic).map(c => ({
      url: null,
      id: c.id,
      message: c.content,
      author: c.authorName,
      type: 'confidence'
    }));
    
    return [...userPhotos, ...candlesImages, ...publicConfidences].sort(() => Math.random() - 0.5);
  }, [contributions, candles, confidences]);

  const duplicatedMixed = useMemo(() => [...mixed, ...mixed, ...mixed, ...mixed], [mixed]);

  const mixedRef = useRef<HTMLDivElement>(null);
  const [lightboxState, setLightboxState] = useState<{items: any[], index: number} | null>(null);

  useEffect(() => {
    const updateMarquee = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current) {
        const contentWidth = ref.current.scrollWidth / 2;
        ref.current.style.setProperty('--marquee-distance', `-${contentWidth}px`);
        ref.current.style.setProperty('--marquee-duration', `${contentWidth / MARQUEE_SPEED}s`);
      }
    };

    setTimeout(() => updateMarquee(mixedRef), 100);
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateMarquee(mixedRef);
      });
    });
    if (mixedRef.current) observer.observe(mixedRef.current);
    return () => observer.disconnect();
  }, [mixed.length]);

  if (mixed.length === 0) return null;

  return (
    <div className="w-full overflow-hidden py-8 bg-rose-50/20 border-y border-rose-100/30">
      <div className="relative flex overflow-x-hidden group">
        <div ref={mixedRef} className="animate-marquee flex gap-10 sm:gap-16 whitespace-nowrap group-hover:[animation-play-state:paused] items-start py-12">
          {duplicatedMixed.map((item, idx) => (
            <div 
              key={`mixed-${item.id}-${idx}`}
              className="flex flex-col items-center gap-6 p-8 bg-white rounded-[48px] border border-rose-100/50 shadow-[0_12px_50px_rgb(244,63,94,0.1)] min-w-[380px] max-w-[420px] cursor-pointer hover:shadow-[0_20px_60px_rgb(244,63,94,0.15)] transition-all duration-500 hover:-translate-y-3"
              onClick={() => setLightboxState({ items: mixed, index: idx % mixed.length })}
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden rounded-[32px] bg-rose-50/30 flex items-center justify-center p-4">
                {item.url ? (
                  <img 
                    src={item.url} 
                    alt="Coloriage ou Bougie" 
                    className="w-full h-full object-contain rounded-2xl shadow-sm" 
                    style={{ transform: `rotate(${rotations[item.url] || 0}deg)` }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-rose-50 to-white rounded-2xl border border-rose-100/50">
                    <BookHeart className="w-12 h-12 text-rose-200 mb-4" />
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em]">Confidence</span>
                  </div>
                )}
              </div>
              <div className="text-center px-6 w-full pb-2">
                {item.message ? (
                  <p className="text-base text-rose-900 italic line-clamp-3 leading-relaxed mb-4 whitespace-normal font-serif">
                    "{item.message}"
                  </p>
                ) : (
                  <div className="h-4" /> // Petit espace si pas de message
                )}
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-rose-100" />
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-[0.3em]">
                    {item.author}
                  </p>
                  <div className="h-px w-8 bg-rose-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightboxState !== null && (
          <Lightbox
            items={lightboxState.items}
            currentIndex={lightboxState.index}
            onClose={() => setLightboxState(null)}
            onPrev={() => setLightboxState(prev => prev ? { ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length } : null)}
            onNext={() => setLightboxState(prev => prev ? { ...prev, index: (prev.index + 1) % prev.items.length } : null)}
            likes={likes}
            onLike={onLike}
            rotations={rotations}
            onRotate={onRotate}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Hero = ({ settings, rotations, isAdmin, onRotate }: { settings: GlobalSettings | null, rotations: Record<string, number>, isAdmin: boolean, onRotate: (url: string) => void }) => {
  const getImageRotation = (url: string) => rotations[url] || 0;
  const heroUrl = settings?.heroImageUrl || "https://i.postimg.cc/667ZsPjq/PHOTO-2025-04-18-10-46-39.jpg";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 md:gap-20 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 md:space-y-10 text-center lg:text-left"
        >
          {settings?.showHeroBadge && (
            <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-50 text-rose-500 rounded-full text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> Joy's Memory Book
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif text-rose-950 leading-[1.1] tracking-tight">
            Pour Joy,<br />
            <span className="italic text-rose-400">notre petite étoile</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-rose-800/60 leading-relaxed max-w-xl mx-auto lg:mx-0 px-4 sm:px-0">
            {settings?.heroDescription || "Un espace sacré pour partager nos souvenirs, nos dessins et allumer une bougie pour Joy. Parce que l'amour ne s'éteint jamais."}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          {isAdmin && (
            <button 
              onClick={() => onRotate(heroUrl)}
              className="absolute top-4 right-4 z-20 p-3 bg-white/90 backdrop-blur-sm text-rose-400 hover:text-rose-600 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
              title="Faire pivoter"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          <div className="absolute -inset-4 bg-rose-200/20 blur-3xl rounded-full" />
          <div className="relative polaroid rotate-3 hover:rotate-0 transition-all duration-700">
            <img 
              src={heroUrl} 
              alt="Joy" 
              className="w-full aspect-[4/5] object-cover rounded-sm brightness-[1.05] contrast-[1.05] transition-transform duration-500"
              style={{ transform: `rotate(${getImageRotation(heroUrl)}deg)` }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-4 left-0 right-0 text-center">
            </div>
          </div>
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-24 h-24 bg-white p-2 rounded-2xl shadow-xl -rotate-12 hidden md:block"
          >
            <div className="w-full h-full bg-rose-50 rounded-xl flex items-center justify-center">
              <Heart className="w-10 h-10 text-rose-400 fill-rose-400" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

const CurrentTheme = ({ theme, selectedYear, user, onSuccess }: { theme: Theme | undefined, selectedYear: number, user: User | null, onSuccess: () => void }) => {
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


const ContributionForm = ({ user, selectedYear, onSuccess, title = "Déposer un hommage" }: { user: User | null, selectedYear: number, onSuccess: () => void, title?: string }) => {
  const [authorName, setAuthorName] = useState(user?.displayName || '');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update authorName when user changes
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

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, isLoading }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void, isLoading?: boolean }) => {
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

const CandleRitualSection = ({ user, candles, candleLibrary, isAdmin, onDelete, likes, onLike, onSuccess, showCandlesModal, setShowCandlesModal }: { 
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

const BookCard = ({ 
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

const CandleRitual = ({ 
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

const Notebook = ({ 
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

// Helper to strip emojis and unsupported characters for jsPDF standard fonts
const sanitizeForPDF = (text: string) => {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // En and em dashes
    .replace(/[\u2026]/g, '...')     // Ellipsis
    .replace(/[\u0152]/g, 'OE')      // OE ligature
    .replace(/[\u0153]/g, 'oe')      // oe ligature
    .replace(/[\u0178]/g, 'Y')       // Y with diaeresis
    .replace(/[\u20AC]/g, 'EUR')     // Euro symbol
    .replace(/[^\x00-\xFF\r\n]/g, '') // Keep basic Latin and Latin-1
    .trim();
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

const Footer = () => (
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

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-center" richColors />
      <AppContent />
    </ErrorBoundary>
  );
}

const ThemeManager = ({ themes, onClose }: { themes: Theme[], onClose: () => void }) => {
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

const CandleLibraryManager = ({ candles, onClose }: { candles: CandleLibraryItem[], onClose: () => void }) => {
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

const PasswordGate = ({ onAuthorized, correctPassword }: { onAuthorized: () => void, correctPassword?: string }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      onAuthorized();
      sessionStorage.setItem('site_authorized', 'true');
    } else {
      setError(true);
      toast.error("Mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBFB] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-12 rounded-[40px] shadow-2xl shadow-rose-100 border border-rose-50 text-center"
      >
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Lock className="w-10 h-10 text-rose-400" />
        </div>
        <h1 className="text-3xl font-serif text-rose-900 mb-4">Espace Privé</h1>
        <p className="text-rose-800/60 mb-8">
          Cet espace est réservé aux proches de Joy. Veuillez entrer le mot de passe pour accéder aux souvenirs.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="password" 
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Mot de passe"
            className={cn(
              "w-full px-6 py-4 bg-rose-50 border rounded-2xl outline-none transition-all text-center text-lg",
              error ? "border-red-300 ring-2 ring-red-100" : "border-rose-100 focus:ring-2 focus:ring-rose-200"
            )}
            autoFocus
          />
          <button 
            type="submit"
            className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
          >
            Entrer
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const GlobalSettingsManager = ({ 
  settings, 
  onClose,
  rotations,
  onRotate
}: { 
  settings: GlobalSettings | null, 
  onClose: () => void,
  rotations: Record<string, number>,
  onRotate: (url: string) => void
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const marqueeFileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    heroImageUrl: settings?.heroImageUrl || "https://i.postimg.cc/667ZsPjq/PHOTO-2025-04-18-10-46-39.jpg",
    heroDescription: settings?.heroDescription || "Un espace sacré pour partager nos souvenirs, nos dessins et allumer une bougie pour Joy. Parce que l'amour ne s'éteint jamais.",
    showHeroBadge: settings?.showHeroBadge ?? true,
    sitePassword: settings?.sitePassword || "",
    backgroundMusicUrl: settings?.backgroundMusicUrl || "",
    enableParticles: settings?.enableParticles ?? true,
    enableNightMode: settings?.enableNightMode ?? false,
    marqueePhotos: settings?.marqueePhotos || [],
    hiddenMarqueePhotos: settings?.hiddenMarqueePhotos || []
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedFile = await compressImageFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const watermarked = await applyWatermark(base64, "Souvenir de Joy");
        setFormData({ ...formData, heroImageUrl: watermarked });
      };
      reader.readAsDataURL(compressedFile);
    }
  };

  const handleMarqueeFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const toastId = toast.loading(`Traitement de ${files.length} photo(s)...`);
      try {
        const newPhotos: string[] = [];
        for (const file of files) {
          // Use more aggressive compression for marquee photos to stay under 1MB doc limit
          const options = {
            maxSizeMB: 0.05,
            maxWidthOrHeight: 600,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(compressedFile);
          });
          const watermarked = await applyWatermark(base64, "Souvenir de Joy");
          newPhotos.push(watermarked);
        }
        setFormData(prev => ({
          ...prev,
          marqueePhotos: [...prev.marqueePhotos, ...newPhotos]
        }));
        toast.success(`${files.length} photo(s) ajoutée(s)`, { id: toastId });
      } catch (error) {
        toast.error("Erreur lors du chargement des photos", { id: toastId });
      }
    }
  };

  const toggleMarqueePhoto = (url: string) => {
    if (JOY_PHOTOS.includes(url)) {
      // It's a predefined photo, toggle it in hiddenMarqueePhotos
      setFormData(prev => {
        const isHidden = prev.hiddenMarqueePhotos.includes(url);
        return {
          ...prev,
          hiddenMarqueePhotos: isHidden 
            ? prev.hiddenMarqueePhotos.filter(u => u !== url)
            : [...prev.hiddenMarqueePhotos, url]
        };
      });
    } else {
      // It's a custom photo, remove it from marqueePhotos
      setFormData(prev => ({
        ...prev,
        marqueePhotos: prev.marqueePhotos.filter(u => u !== url)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading("Enregistrement des modifications...");
    const path = 'settings';
    try {
      if (settings?.id) {
        await updateDoc(doc(db, path, settings.id), formData);
      } else {
        await addDoc(collection(db, path), formData);
      }
      toast.success("Paramètres mis à jour !", { id: toastId });
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      toast.error("Erreur lors de la mise à jour", { id: toastId });
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const allPhotos = useMemo(() => {
    const customPhotos = formData.marqueePhotos.filter(url => !JOY_PHOTOS.includes(url));
    return [...JOY_PHOTOS, ...customPhotos];
  }, [formData.marqueePhotos]);

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
          <h2 className="text-2xl font-serif text-rose-900">Paramètres Généraux</h2>
          <button onClick={onClose} className="p-2 hover:bg-rose-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-rose-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Photo Centrale (Hero)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={formData.heroImageUrl}
                  onChange={e => setFormData({...formData, heroImageUrl: e.target.value})}
                  className="flex-1 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                  placeholder="https://... ou photo chargée"
                  required
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-3 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-all flex items-center gap-2"
                  title="Charger une photo depuis votre appareil"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              {formData.heroImageUrl.startsWith('data:') && (
                <p className="mt-1 text-[10px] text-rose-400 italic">Photo chargée localement.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Description du projet</label>
              <textarea 
                value={formData.heroDescription}
                onChange={e => setFormData({...formData, heroDescription: e.target.value})}
                className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none min-h-[120px]"
                placeholder="Description du projet..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Mot de passe du site (Optionnel)</label>
              <input 
                type="text" 
                value={formData.sitePassword}
                onChange={e => setFormData({...formData, sitePassword: e.target.value})}
                className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                placeholder="Laissez vide pour un accès libre"
              />
              <p className="mt-1 text-[10px] text-rose-400 italic">Si défini, les visiteurs devront entrer ce mot de passe pour voir le contenu.</p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
              <input 
                type="checkbox" 
                id="showBadge"
                checked={formData.showHeroBadge}
                onChange={e => setFormData({...formData, showHeroBadge: e.target.checked})}
                className="w-5 h-5 accent-rose-500"
              />
              <label htmlFor="showBadge" className="text-sm font-bold text-rose-900 cursor-pointer">
                Afficher le badge "Joy's Memory Book"
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-rose-100">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-rose-900 uppercase tracking-widest">Photos du Bandeau</h3>
                <button 
                  type="button"
                  onClick={() => marqueeFileInputRef.current?.click()}
                  className="px-4 py-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-all flex items-center gap-2 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> Ajouter des photos
                </button>
                <input 
                  type="file" 
                  ref={marqueeFileInputRef}
                  onChange={handleMarqueeFilesChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 max-h-[350px] overflow-y-auto">
                {allPhotos.map((url, idx) => {
                  const isHidden = formData.hiddenMarqueePhotos.includes(url);
                  const rotation = rotations[url] || 0;
                  
                  return (
                    <div key={`marquee-edit-${idx}`} className={cn(
                      "relative group aspect-square rounded-xl overflow-hidden border shadow-sm transition-all",
                      isHidden ? "opacity-40 grayscale border-rose-100" : "border-rose-200"
                    )}>
                      <img 
                        src={url} 
                        alt={`Marquee ${idx}`} 
                        className="w-full h-full object-cover" 
                        style={{ transform: `rotate(${rotation}deg)` }}
                      />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => onRotate(url)}
                          className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all"
                          title="Faire pivoter"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => toggleMarqueePhoto(url)}
                          className={cn(
                            "p-2 rounded-full transition-all",
                            isHidden ? "bg-green-500 text-white" : "bg-rose-500 text-white"
                          )}
                          title={isHidden ? "Réafficher" : "Masquer/Supprimer"}
                        >
                          {isHidden ? <Plus className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {isHidden && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="bg-rose-500/80 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Masquée</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-rose-400 italic">Toutes les photos (prédéfinies et ajoutées) sont gérables ici. Cliquez sur l'icône de rotation pour tourner ou sur la croix pour masquer/supprimer.</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-rose-100">
              <h3 className="text-sm font-bold text-rose-900 uppercase tracking-widest">Ambiance & Effets</h3>
              
              <div>
                <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">URL Musique de fond (MP3)</label>
                <input 
                  type="url" 
                  value={formData.backgroundMusicUrl}
                  onChange={e => setFormData({...formData, backgroundMusicUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none"
                  placeholder="https://.../music.mp3"
                />
                <p className="mt-1 text-[10px] text-rose-400 italic">Laissez vide pour désactiver la musique.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                  <input 
                    type="checkbox" 
                    id="enableParticles"
                    checked={formData.enableParticles}
                    onChange={e => setFormData({...formData, enableParticles: e.target.checked})}
                    className="w-5 h-5 accent-rose-500"
                  />
                  <label htmlFor="enableParticles" className="text-sm font-bold text-rose-900 cursor-pointer">
                    Activer les particules (cœurs/étoiles)
                  </label>
                </div>

                <div className="flex items-center gap-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                  <input 
                    type="checkbox" 
                    id="enableNightMode"
                    checked={formData.enableNightMode}
                    onChange={e => setFormData({...formData, enableNightMode: e.target.checked})}
                    className="w-5 h-5 accent-rose-500"
                  />
                  <label htmlFor="enableNightMode" className="text-sm font-bold text-rose-900 cursor-pointer">
                    Activer le mode nuit par défaut
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "flex-1 py-4 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2",
                  isSubmitting ? "bg-rose-400 cursor-not-allowed" : "bg-rose-500 hover:bg-rose-600"
                )}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer les modifications"
                )}
              </button>
              <button 
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-8 py-4 text-rose-400 font-bold hover:text-rose-600 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- PDF Export Modal ---
const PDFExportModal = ({ 
  contributions, 
  candles, 
  onClose 
}: { 
  contributions: Contribution[], 
  candles: Candle[], 
  onClose: () => void 
}) => {
  const [options, setOptions] = useState({
    drawings: true,
    candles: true
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Préparation du PDF...");
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let currentY = margin;

      // Helper to add a new page if needed
      const checkNewPage = (heightNeeded: number) => {
        if (currentY + heightNeeded > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      const getImageDimensions = (base64: string): Promise<{w: number, h: number}> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.onerror = () => resolve({ w: 800, h: 600 });
          img.src = base64;
        });
      };

      // Title Page
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(28);
      pdf.setTextColor(225, 29, 72); // rose-600
      pdf.text("Joy's Memory Book", pageWidth / 2, 80, { align: "center" });
      
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(16);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text("Un recueil de souvenirs, de dessins et de mots doux", pageWidth / 2, 95, { align: "center" });
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(`Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, pageWidth / 2, 110, { align: "center" });
      
      // 1. Drawings (Coloriages)
      if (options.drawings) {
        const drawings = contributions.filter(c => c.imageUrl || c.isPdf);
        if (drawings.length > 0) {
          for (const draw of drawings) {
            if (draw.isPdf && draw.pdfData) {
              try {
                const loadingTask = pdfjsLib.getDocument(draw.pdfData);
                const pdfDoc = await loadingTask.promise;
                
                for (let p = 1; p <= pdfDoc.numPages; p++) {
                  pdf.addPage();
                  const page = await pdfDoc.getPage(p);
                  const viewport = page.getViewport({ scale: 2.0 });
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  
                  if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await (page as any).render({ canvasContext: context, viewport }).promise;
                    const pageImgData = canvas.toDataURL('image/jpeg', 0.9);
                    
                    const maxW = pageWidth - (margin * 2);
                    const maxH = pageHeight - (margin * 2);
                    const r = Math.min(maxW / viewport.width, maxH / viewport.height);
                    const w = viewport.width * r;
                    const h = viewport.height * r;
                    
                    pdf.addImage(pageImgData, 'JPEG', (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
                    
                    // Add author at bottom
                    pdf.setFontSize(10);
                    pdf.setFont("helvetica", "italic");
                    pdf.setTextColor(150, 150, 150);
                    pdf.text(`Dessin par ${sanitizeForPDF(draw.authorName)} - Page ${p}/${pdfDoc.numPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
                  }
                }
              } catch (e) {
                console.error("Error extracting PDF pages", e);
                pdf.addPage();
                pdf.text("Erreur lors de l'extraction du PDF", margin, margin);
              }
            } else if (draw.imageUrl) {
              pdf.addPage();
              try {
                let imgData = draw.imageUrl;
                if (imgData.startsWith('http')) {
                  imgData = await urlToBase64(imgData);
                }
                
                const dims = await getImageDimensions(imgData);
                const maxW = pageWidth - (margin * 2);
                const maxH = pageHeight - (margin * 2.5);
                
                const r = Math.min(maxW / dims.w, maxH / dims.h);
                const w = dims.w * r;
                const h = dims.h * r;
                
                // Center the image on the A4 page
                const x = (pageWidth - w) / 2;
                const y = margin;
                pdf.addImage(imgData, 'JPEG', x, y, w, h);
                
                let textY = y + h + 8;
                pdf.setFontSize(12);
                pdf.setFont("helvetica", "italic");
                pdf.setTextColor(225, 29, 72);
                pdf.text(`Par ${sanitizeForPDF(draw.authorName)}`, pageWidth / 2, textY, { align: "center" });
                
                if (draw.message) {
                  textY += 6;
                  pdf.setFontSize(10);
                  pdf.setFont("helvetica", "normal");
                  pdf.setTextColor(51, 65, 85);
                  const splitMsg = pdf.splitTextToSize(sanitizeForPDF(draw.message), pageWidth - (margin * 4));
                  pdf.text(splitMsg, pageWidth / 2, textY, { align: "center" });
                }
              } catch (e) {
                console.error("Error adding image", e);
              }
            }
          }
        }
      }

      // 2. Words (Mots) - Grouped by Category then Year
      // Collect all text-based items
      const allNotes = [
        ...contributions.filter(c => c.message && !c.imageUrl && !c.isPdf && c.type !== 'candle')
                       .map(c => ({ id: c.id, authorName: c.authorName, message: c.message!, year: c.year, category: 'Messages de Soutien' }))
      ];

      if (allNotes.length > 0) {
          pdf.addPage();
          currentY = margin;
          pdf.setFontSize(24);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(225, 29, 72);
          pdf.text("Mots Doux et Souvenirs", pageWidth / 2, currentY, { align: "center" });
          currentY += 20;

          // Group by Category
          const categories = Array.from(new Set(allNotes.map(n => n.category)));
          
          for (const cat of categories) {
            checkNewPage(20);
            pdf.setFontSize(20);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(225, 29, 72);
            pdf.text(cat, margin, currentY);
            currentY += 12;
            pdf.setDrawColor(225, 29, 72, 0.3);
            pdf.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
            currentY += 5;

            const catNotes = allNotes.filter(n => n.category === cat);
            const years = Array.from(new Set(catNotes.map(n => n.year))).sort((a, b) => b - a);

            for (const year of years) {
              checkNewPage(15);
              pdf.setFontSize(14);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(100, 116, 139);
              pdf.text(`Année ${year}`, margin, currentY);
              currentY += 10;

              const yearNotes = catNotes.filter(n => n.year === year);
              for (const note of yearNotes) {
                const safeText = sanitizeForPDF(note.message);
                const safeAuthor = sanitizeForPDF(note.authorName);
                
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(51, 65, 85);
                
                const splitMsg = pdf.splitTextToSize(`"${safeText}"`, pageWidth - (margin * 4));
                const msgHeight = splitMsg.length * 6;
                
                checkNewPage(msgHeight + 20);
                
                // Add a subtle background for each message
                pdf.setFillColor(252, 251, 251);
                pdf.roundedRect(margin, currentY - 2, pageWidth - (margin * 2), msgHeight + 14, 2, 2, 'F');
                
                pdf.text(splitMsg, margin + 6, currentY + 6);
                currentY += msgHeight + 8;
                
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(9);
                pdf.setTextColor(225, 29, 72);
                pdf.text(`— ${safeAuthor}`, pageWidth - margin - 6, currentY, { align: "right" });
                currentY += 15;
              }
            }
            currentY += 10;
          }
        }

      // 3. Candles (Bougies)
      if (options.candles) {
        const candleMessages = candles.filter(c => c.prayer);
        if (candleMessages.length > 0) {
          pdf.addPage();
          currentY = margin;
          pdf.setFontSize(24);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(225, 29, 72);
          pdf.text("Bougies et Pensées", pageWidth / 2, currentY, { align: "center" });
          currentY += 20;

          for (const candle of candleMessages) {
            const safeText = sanitizeForPDF(candle.prayer!);
            const safeAuthor = sanitizeForPDF(candle.authorName);
            
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "italic");
            pdf.setTextColor(51, 65, 85);
            
            const splitMsg = pdf.splitTextToSize(`"${safeText}"`, pageWidth - (margin * 3));
            const msgHeight = splitMsg.length * 5;
            
            checkNewPage(msgHeight + 15);
            
            pdf.setFillColor(255, 241, 242);
            pdf.roundedRect(margin, currentY - 5, pageWidth - (margin * 2), msgHeight + 15, 3, 3, 'F');
            
            pdf.text(splitMsg, margin + 5, currentY + 5);
            currentY += msgHeight + 7;
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.setTextColor(225, 29, 72);
            pdf.text(`— ${safeAuthor}`, pageWidth - margin - 10, currentY, { align: "right" });
            currentY += 15;
          }
        }
      }

      pdf.save(`Joy-Memory-Book-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("PDF exporté avec succès !", { id: toastId });
      onClose();
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Erreur lors de l'exportation.", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-rose-950/40 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-rose-100"
      >
        <div className="p-8 border-b border-rose-50 flex justify-between items-center bg-rose-50/30">
          <h2 className="text-2xl font-serif text-rose-900">Exporter en PDF</h2>
          <button onClick={onClose} className="p-2 hover:bg-rose-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-rose-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-rose-800/60 text-sm">Sélectionnez les éléments à inclure.</p>
            <button 
              onClick={() => {
                const allSelected = options.drawings && options.candles;
                setOptions({ drawings: !allSelected, candles: !allSelected });
              }}
              className="text-xs font-bold text-rose-500 hover:text-rose-600"
            >
              {options.drawings && options.candles ? "Tout décocher" : "Tout cocher"}
            </button>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center gap-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-50 transition-colors">
              <input 
                type="checkbox" 
                checked={options.drawings} 
                onChange={() => setOptions(prev => ({ ...prev, drawings: !prev.drawings }))}
                className="w-5 h-5 accent-rose-500"
              />
              <div className="flex-1">
                <p className="font-bold text-rose-900">Dessins et Coloriages</p>
                <p className="text-xs text-rose-400 uppercase tracking-widest">Les créations artistiques</p>
              </div>
            </label>

            <label className="flex items-center gap-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-50 transition-colors">
              <input 
                type="checkbox" 
                checked={options.candles} 
                onChange={() => setOptions(prev => ({ ...prev, candles: !prev.candles }))}
                className="w-5 h-5 accent-rose-500"
              />
              <div className="flex-1">
                <p className="font-bold text-rose-900">Bougies et Pensées</p>
                <p className="text-xs text-rose-400 uppercase tracking-widest">Les messages d'allumage</p>
              </div>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={generatePDF}
              disabled={isGenerating || (!options.drawings && !options.candles)}
              className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" /> Générer le PDF
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfidenceForm = ({ user, onSuccess }: { user: User | null, onSuccess: () => void }) => {
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

const ConfidencesModal = ({ user, isOpen, onClose }: { user: User | null, isOpen: boolean, onClose: () => void }) => {
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

const ConfidenceSection = ({ user, onOpenPrivate }: { user: User | null, onOpenPrivate: () => void }) => {
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

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [lastVisibleContrib, setLastVisibleContrib] = useState<any>(null);
  const [hasMoreContribs, setHasMoreContribs] = useState(true);
  const [isLoadingMoreContribs, setIsLoadingMoreContribs] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [confidences, setConfidences] = useState<Confidence[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [candleLibrary, setCandleLibrary] = useState<CandleLibraryItem[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [selectedCandleYear, setSelectedCandleYear] = useState(new Date().getFullYear());
  const [selectedThemeYear, setSelectedThemeYear] = useState(new Date().getFullYear());
  useEffect(() => {
    if (!isAuthReady) return;
    
    const qCandles = query(collection(db, 'candles'), orderBy('createdAt', 'asc'), limit(100));
    const unsubscribeCandles = onSnapshot(qCandles, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candle));
      setCandles(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'candles');
    });

    const qConfidences = query(collection(db, 'confidences'), where('isPublic', '==', true), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeConfidences = onSnapshot(qConfidences, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Confidence));
      setConfidences(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'confidences');
    });

    const qThemes = query(collection(db, 'themes'), orderBy('year', 'desc'));
    const unsubscribeThemes = onSnapshot(qThemes, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Theme));
      setThemes(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'themes');
    });

    const qSettings = collection(db, 'settings');
    const unsubscribeSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setSettings({ id: doc.id, ...doc.data() } as GlobalSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings');
    });

    const qCandleLib = collection(db, 'candle_library');
    const unsubscribeCandleLib = onSnapshot(qCandleLib, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CandleLibraryItem));
      setCandleLibrary(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'candle_library');
    });

    return () => {
      unsubscribeCandles();
      unsubscribeConfidences();
      unsubscribeThemes();
      unsubscribeSettings();
      unsubscribeCandleLib();
    };
  }, [isAuthReady]);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showCandlesModal, setShowCandlesModal] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [showConfidencesModal, setShowConfidencesModal] = useState(false);

  // Bloquer le scroll quand une modale est ouverte
  useEffect(() => {
    if (showCandlesModal || showNotebookModal || showConfidencesModal || showAdminDashboard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showCandlesModal, showNotebookModal, showConfidencesModal, showAdminDashboard]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCandleId, setActiveCandleId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [editPrayer, setEditPrayer] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('site_authorized') === 'true';
    }
    return false;
  });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'contribution' | 'candle' | 'note' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [rotations, setRotations] = useState<Record<string, number>>({});

  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchData = async (force = false) => {
    if (!isAuthReady || isLoading) return;
    
    const now = Date.now();
    if (!force && now - lastFetchTime < 300000) return; // Cache for 5 minutes unless forced
    
    setIsLoading(true);
    setLastFetchTime(now);
    
    try {
      // 1. Contributions
      const qContrib = query(collection(db, 'contributions'), orderBy('createdAt', 'desc'), limit(15));
      const contribSnapshot = await getDocs(qContrib);
      const contribItems = contribSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution));
      setContributions(contribItems);

      // 2. Confidences (Public)
      const qConf = query(collection(db, 'confidences'), where('isPublic', '==', true), orderBy('createdAt', 'desc'), limit(15));
      const confSnapshot = await getDocs(qConf);
      const confItems = confSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Confidence));
      setConfidences(confItems);

      if (contribSnapshot.docs.length > 0) {
        setLastVisibleContrib(contribSnapshot.docs[contribSnapshot.docs.length - 1]);
        setHasMoreContribs(contribSnapshot.docs.length === 15);
      } else {
        setHasMoreContribs(false);
      }

      // 2. Themes
      const qTheme = query(collection(db, 'themes'), orderBy('year', 'desc'), limit(15));
      const themeSnapshot = await getDocs(qTheme);
      const themeItems = themeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Theme));
      setThemes(themeItems);

      // 4. Settings
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      let currentSettings: GlobalSettings | null = null;
      if (!settingsSnapshot.empty) {
        const doc = settingsSnapshot.docs[0];
        currentSettings = { id: doc.id, ...doc.data() } as GlobalSettings;
        setSettings(currentSettings);
      }

      // 5. Candle Library
      const candleLibSnapshot = await getDocs(collection(db, 'candle_library'));
      const libData = candleLibSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CandleLibraryItem));
      setCandleLibrary(libData);

      // 6. Collect IDs for Likes and Rotations (Only for visible items)
      const visibleItemIds = new Set<string>();
      contribItems.forEach(c => visibleItemIds.add(c.id));
      candles.forEach(c => visibleItemIds.add(c.id));
      
      const visibleUrls = new Set<string>();
      if (currentSettings?.heroImageUrl) visibleUrls.add(currentSettings.heroImageUrl);
      JOY_PHOTOS.forEach(url => visibleUrls.add(url));
      if (currentSettings?.marqueePhotos) {
        currentSettings.marqueePhotos.forEach(url => visibleUrls.add(url));
      }
      contribItems.forEach(c => { if (c.imageUrl) visibleUrls.add(c.imageUrl); });
      candles.forEach(c => { if (c.candleUrl) visibleUrls.add(c.candleUrl); });

      // 7. Fetch Likes in chunks of 30 (Firestore limit for 'in' query)
      const idList = Array.from(visibleItemIds);
      const newLikes: Record<string, number> = {};
      for (let i = 0; i < idList.length; i += 30) {
        const chunk = idList.slice(i, i + 30);
        const qLikes = query(collection(db, 'likes'), where('__name__', 'in', chunk));
        const likesSnap = await getDocs(qLikes);
        likesSnap.forEach(doc => {
          newLikes[doc.id] = doc.data().count || 0;
        });
      }
      setLikes(newLikes);

      // 8. Fetch Rotations in chunks of 30
      const getUrlHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash |= 0;
        }
        return Math.abs(hash).toString(36);
      };

      const urlList = Array.from(visibleUrls);
      const urlHashes = urlList.map(url => ({ url, hash: getUrlHash(url) }));
      const hashList = urlHashes.map(h => h.hash);
      const newRotations: Record<string, number> = {};
      
      for (let i = 0; i < hashList.length; i += 30) {
        const chunk = hashList.slice(i, i + 30);
        const qRots = query(collection(db, 'rotations'), where('__name__', 'in', chunk));
        const rotsSnap = await getDocs(qRots);
        rotsSnap.forEach(doc => {
          const data = doc.data();
          if (data.url) {
            newRotations[data.url] = data.rotation || 0;
          }
        });
      }
      setRotations(newRotations);

    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreContributions = async () => {
    if (!isAuthReady || !hasMoreContribs || isLoadingMoreContribs || !lastVisibleContrib) return;
    setIsLoadingMoreContribs(true);
    try {
      const qContrib = query(
        collection(db, 'contributions'), 
        orderBy('createdAt', 'desc'), 
        startAfter(lastVisibleContrib),
        limit(15)
      );
      const contribSnapshot = await getDocs(qContrib);
      const newContribItems = contribSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution));
      
      setContributions(prev => {
        // Prevent duplicates
        const existingIds = new Set(prev.map(c => c.id));
        const uniqueNew = newContribItems.filter(c => !existingIds.has(c.id));
        return [...prev, ...uniqueNew];
      });

      // Fetch likes and rotations for new items
      const newIds = newContribItems.map(c => c.id);
      if (newIds.length > 0) {
        const qLikes = query(collection(db, 'likes'), where('__name__', 'in', newIds));
        const likesSnap = await getDocs(qLikes);
        const moreLikes: Record<string, number> = {};
        likesSnap.forEach(doc => {
          moreLikes[doc.id] = doc.data().count || 0;
        });
        setLikes(prev => ({ ...prev, ...moreLikes }));
      }

      const newUrls = newContribItems.filter(c => c.imageUrl).map(c => c.imageUrl!);
      if (newUrls.length > 0) {
        const getUrlHash = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
          }
          return Math.abs(hash).toString(36);
        };
        const hashes = newUrls.map(url => getUrlHash(url));
        const qRots = query(collection(db, 'rotations'), where('__name__', 'in', hashes));
        const rotsSnap = await getDocs(qRots);
        const moreRots: Record<string, number> = {};
        rotsSnap.forEach(doc => {
          const data = doc.data();
          if (data.url) moreRots[data.url] = data.rotation || 0;
        });
        setRotations(prev => ({ ...prev, ...moreRots }));
      }
      
      if (contribSnapshot.docs.length > 0) {
        setLastVisibleContrib(contribSnapshot.docs[contribSnapshot.docs.length - 1]);
        setHasMoreContribs(contribSnapshot.docs.length === 15);
      } else {
        setHasMoreContribs(false);
      }
    } catch (error) {
      console.error("Fetch more error:", error);
    } finally {
      setIsLoadingMoreContribs(false);
    }
  };

  useEffect(() => {
    if (isAuthReady) {
      fetchData();
    }
  }, [isAuthReady]);

  const [pendingWrites, setPendingWrites] = useState<Set<string>>(new Set());

  const handleRotate = async (url: string) => {
    if (pendingWrites.has(url)) return;
    
    const currentRotation = rotations[url] || 0;
    const nextRotation = (currentRotation + 90) % 360;
    
    // Optimistic update
    setRotations(prev => ({ ...prev, [url]: nextRotation }));
    setPendingWrites(prev => new Set(prev).add(url));
    
    // Create a safe ID from the URL hash to avoid length issues with base64
    const getUrlHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(36);
    };
    const docId = getUrlHash(url);
    
    try {
      await setDoc(doc(db, 'rotations', docId), {
        url,
        rotation: nextRotation,
        updatedAt: serverTimestamp()
      });
      toast.success("Rotation mise à jour.");
    } catch (error) {
      // Revert on error
      setRotations(prev => ({ ...prev, [url]: currentRotation }));
      handleFirestoreError(error, OperationType.WRITE, 'rotations');
    } finally {
      setPendingWrites(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const [showPDFExport, setShowPDFExport] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const triggerThankYouAnimation = () => {
    const duration = 4000;
    const end = Date.now() + duration;
    const colors = ['#FFD700', '#FFF8DC', '#FFFFFF', '#FFE4E1'];
    
    (function frame() {
      confetti({
        particleCount: 2,
        angle: 90,
        spread: 60,
        origin: { x: 0.5, y: 0.8 },
        colors: colors,
        shapes: ['circle'],
        scalar: 0.6,
        gravity: -0.1,
        decay: 0.9,
        ticks: 300,
        startVelocity: 15,
        disableForReducedMotion: true
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 4000);
    fetchData(true); // Refresh data after success
  };

  const handleLike = async (id: string) => {
    if (pendingWrites.has(id)) return;

    const likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');
    if (likedItems.includes(id)) {
      toast.info("Vous avez déjà aimé ceci.");
      return;
    }

    setPendingWrites(prev => new Set(prev).add(id));
    try {
      const likeDocRef = doc(db, 'likes', id);
      const likeDoc = await getDocFromServer(likeDocRef);
      if (!likeDoc.exists()) {
        await setDoc(likeDocRef, { count: 1 });
      } else {
        await updateDoc(likeDocRef, { count: increment(1) });
      }
      likedItems.push(id);
      localStorage.setItem('liked_items', JSON.stringify(likedItems));
      setLikes(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      toast.success("Merci pour votre soutien !");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'likes');
    } finally {
      setPendingWrites(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Atmosphere State
  const [showParticles, setShowParticles] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (settings) {
      setShowParticles(settings.enableParticles ?? true);
    }
  }, [settings]);

  useEffect(() => {
    if (settings?.backgroundMusicUrl && isMusicPlaying) {
      if (!audioRef.current) {
        audioRef.current = new Audio(settings.backgroundMusicUrl);
        audioRef.current.loop = true;
      }
      audioRef.current.volume = volume;
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isMusicPlaying, settings?.backgroundMusicUrl, volume]);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    const { id, type } = confirmDelete;
    const collectionName = type === 'contribution' ? 'contributions' : 'candles';
    
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast.success("Supprimé avec succès.");
      setConfirmDelete(null);
      fetchData(true); // Refresh UI
    } catch (error) {
      console.error('Delete error:', error);
      handleFirestoreError(error, OperationType.DELETE, collectionName);
      setConfirmDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const bootstrapRef = useRef(false);
  // Bootstrap initial themes if none exist
  useEffect(() => {
    if (isAuthReady && themes.length === 0 && !bootstrapRef.current) {
      bootstrapRef.current = true;
      const bootstrapThemes = async () => {
        const initialThemes = [
          {
            year: 2026,
            title: "Gabby et la Maison Magique",
            description: "Pour ses 4 ans, nous avons choisi l'univers coloré de Gabby Chat, le thème en cours qu'elle aurait sûrement adoré explorer.",
            imageUrl: "https://i.postimg.cc/ZWmJtp9j/PHOTO-2025-04-18-11-11-26.jpg",
            downloadUrl: "",
            age: 4
          }
        ];
        
        for (const t of initialThemes) {
          try {
            // Check if it already exists to be extra safe
            const q = query(collection(db, 'themes'), where('year', '==', t.year), where('title', '==', t.title));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
              await addDoc(collection(db, 'themes'), t);
            }
          } catch (e) {
            console.error("Bootstrap error", e);
          }
        }
      };
      bootstrapThemes(); 
    }
  }, [isAuthReady, themes.length]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
        toast.info("Le téléchargement des images est désactivé pour protéger la mémoire de Joy.");
      }
    };
    
    const handleDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erreur de connexion:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
    }
  };

  const currentTheme = themes.find(t => t.year === selectedThemeYear);
  const availableYears = Array.from(new Set([...themes.map(t => t.year), new Date().getFullYear()]))
    .sort((a, b) => b - a);

  const adminEmails = settings?.adminEmails ?? ADMIN_EMAILS;
  const isAdmin = !!(user?.email && adminEmails.includes(user.email) && user.emailVerified);

  if (settings?.sitePassword && !isAuthorized && !isAdmin) {
    return <PasswordGate onAuthorized={() => setIsAuthorized(true)} correctPassword={settings.sitePassword} />;
  }

  return (
    <div className="min-h-screen transition-colors duration-1000 overflow-x-hidden font-sans selection:bg-rose-100 selection:text-rose-900 bg-[#FFFBFB] text-rose-950">
      {showParticles && <Particles mode="hearts" />}
      
      <TopMarquee 
        settings={settings}
        rotations={rotations}
        isAdmin={isAdmin}
        onRotate={handleRotate}
        likes={likes}
        onLike={handleLike}
      />
      
      {settings?.backgroundMusicUrl && (
        <audio 
          src={settings.backgroundMusicUrl} 
          autoPlay={isMusicPlaying} 
          loop 
          ref={(el) => {
            if (el) {
              el.volume = volume;
              if (isMusicPlaying) el.play().catch(() => setIsMusicPlaying(false));
              else el.pause();
            }
          }}
        />
      )}

      <Header 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onToggleAdmin={() => setShowAdminDashboard(!showAdminDashboard)} 
        onRefresh={fetchData}
        isLoading={isLoading}
        isAdmin={isAdmin}
      />

      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
        {settings?.backgroundMusicUrl && (
          <div className="flex items-center gap-2 p-2 rounded-full border shadow-xl backdrop-blur-md transition-all bg-rose-50 border-rose-100">
            <button 
              onClick={() => setIsMusicPlaying(!isMusicPlaying)}
              className="p-3 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all"
            >
              {isMusicPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            {isMusicPlaying && (
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-rose-500 mr-2"
              />
            )}
          </div>
        )}
      </div>
      
      <main className="pt-0">
        <Hero 
          settings={settings} 
          rotations={rotations} 
          isAdmin={isAdmin} 
          onRotate={handleRotate} 
        />

        <BottomMarquee 
          contributions={contributions} 
          candles={candles} 
          confidences={confidences}
          rotations={rotations}
          isAdmin={isAdmin}
          onRotate={handleRotate}
          likes={likes}
          onLike={handleLike}
        />

        <div className="sticky top-[72px] sm:top-[88px] z-40 bg-white/80 backdrop-blur-md border-b border-rose-100/50 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-serif italic text-rose-800/70">
            <a href="#candles" className="hover:text-rose-500 transition-colors">Allumer une bougie</a>
            <span className="text-rose-200">•</span>
            <a href="#notebook" className="hover:text-rose-500 transition-colors">Le cahier des artistes</a>
            <span className="text-rose-200">•</span>
            <a href="#confidences" className="hover:text-rose-500 transition-colors">Confidences</a>
          </div>
        </div>

      <AnimatePresence>
        {showCandlesModal && (
          <motion.div
            key="candles-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-rose-950/60 backdrop-blur-md"
            onClick={() => setShowCandlesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-white rounded-[32px] sm:rounded-[40px] p-4 sm:p-8 max-w-6xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar relative shadow-2xl mx-auto"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowCandlesModal(false)}
                className="absolute top-3 sm:top-6 right-3 sm:right-6 p-2 bg-rose-50 text-rose-400 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors z-20 shadow-sm"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="text-center mb-6 sm:mb-12 mt-6 sm:mt-0">
                <h2 className="text-2xl sm:text-4xl font-serif italic text-rose-900 mb-2 sm:mb-4">Le Jardin des Lumières</h2>
                <div className="w-12 h-1 bg-rose-200 mx-auto mb-4 rounded-full" />
                <p className="text-rose-800/60 text-sm sm:text-base px-4">Toutes les bougies allumées pour Joy</p>
              </div>

              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-10 sm:gap-8 md:gap-12 justify-items-center pb-10">
                {candles.map((candle, idx) => (
                  <motion.div
                    key={`${candle.id}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: [0, -5, 0] }}
                    transition={{ 
                      opacity: { delay: (idx % 15) * 0.05 },
                      y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: (idx % 15) * 0.2 }
                    }}
                    className="relative group flex flex-col items-center"
                    onClick={() => setActiveCandleId(activeCandleId === candle.id ? null : candle.id)}
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Flame */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 scale-75 sm:scale-100">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8], rotate: [-2, 2, -2] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="relative w-6 h-12"
                        >
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-12 bg-gradient-to-t from-orange-600 via-amber-500 to-transparent rounded-full blur-[1.5px]" />
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-8 bg-gradient-to-t from-amber-300 to-transparent rounded-full" />
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-white rounded-full blur-[0.5px]" />
                        </motion.div>
                      </div>

                      {/* Candle Body */}
                      <div className="relative w-14 h-20 sm:w-16 sm:h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-white group-hover:scale-110 transition-transform duration-500 ring-1 ring-rose-100">
                        {candle.candleUrl ? (
                          <img loading="lazy" src={candle.candleUrl} alt="Bougie" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-rose-50 to-rose-100 flex items-center justify-center">
                            <Flame className="w-6 h-6 text-rose-200" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      </div>

                      {/* Base Shadow */}
                      <div className="w-14 sm:w-16 h-3 bg-rose-900/10 rounded-full blur-[4px] mt-3" />
                    </div>

                    <span className="mt-3 text-[10px] sm:text-xs text-rose-900/80 font-bold uppercase tracking-wider truncate max-w-[80px] sm:max-w-[100px] text-center">
                      {candle.authorName}
                    </span>

                    {/* Tooltip */}
                    <div className={cn(
                      "absolute bottom-full mb-8 w-44 sm:w-56 p-4 bg-white text-rose-950 rounded-2xl shadow-2xl transition-all duration-300 z-50 border border-rose-100 flex flex-col gap-2",
                      activeCandleId === candle.id ? "opacity-100 scale-100 pointer-events-auto translate-y-0" : "opacity-0 scale-90 pointer-events-none translate-y-2 md:group-hover:opacity-100 md:group-hover:scale-100 md:group-hover:pointer-events-auto md:group-hover:translate-y-0",
                      "left-1/2 -translate-x-1/2"
                    )}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm line-clamp-1">{candle.authorName}</p>
                        <div className="flex gap-2">
                          <LikeButton count={likes[candle.id] || 0} onLike={() => handleLike(candle.id)} className="p-1" />
                          {(isAdmin || (user && candle.uid === user.uid)) && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setEditingId(candle.id); setEditPrayer(candle.prayer || ''); }} className="p-1 text-rose-300 hover:text-rose-500 transition-colors"><Edit2 className="w-5 h-5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({id: candle.id, type: 'candle'}); }} className="p-1 text-rose-300 hover:text-rose-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            </>
                          )}
                        </div>
                      </div>
                      {editingId === candle.id ? (
                        <div className="space-y-2 mt-2" onClick={e => e.stopPropagation()}>
                          <textarea value={editPrayer} onChange={(e) => setEditPrayer(e.target.value)} className="w-full p-2 text-xs border border-rose-100 rounded-lg focus:ring-1 focus:ring-rose-200 outline-none resize-none h-20" />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-rose-400">Annuler</button>
                            <button onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'candles', candle.id), { prayer: editPrayer.trim() });
                                setEditingId(null);
                                toast.success("Message mis à jour.");
                                fetchData(true);
                              } catch (error) {
                                handleFirestoreError(error, OperationType.UPDATE, 'candles');
                              }
                            }} className="text-[10px] font-bold text-rose-600">OK</button>
                          </div>
                        </div>
                      ) : (
                        candle.prayer && (
                          <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
                            <p className="italic text-rose-800/80 text-xs leading-relaxed break-words whitespace-normal">"{candle.prayer}"</p>
                          </div>
                        )
                      )}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {candles.length === 0 && (
                <div className="py-20 flex items-center justify-center">
                  <p className="text-rose-800/40 italic font-serif text-xl">Le jardin attend vos lumières...</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotebookModal && (
          <motion.div
            key="notebook-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-sm"
            onClick={() => setShowNotebookModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowNotebookModal(false)}
                className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 bg-rose-50 text-rose-400 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors z-10"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="text-center mb-8 sm:mb-12 mt-4 sm:mt-0">
                <h2 className="text-2xl sm:text-3xl font-serif italic text-rose-900 mb-2 sm:mb-4">Le Cahier des Artistes</h2>
                <p className="text-rose-800/60 text-sm sm:text-base">Coloriages et dessins partagés pour Joy.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                  <input 
                    type="text"
                    placeholder="Rechercher un auteur ou un message..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-rose-50/50 border border-rose-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-200 outline-none w-full"
                  />
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => setShowPDFExport(true)}
                    className="px-6 py-3 bg-rose-100 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-200 transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Exporter PDF
                  </button>
                )}
              </div>

              {contributions.filter(c => {
                const matchesSearch = c.authorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                     (c.message?.toLowerCase().includes(searchQuery.toLowerCase()));
                return matchesSearch;
              }).length === 0 ? (
                <div className="text-center py-20 bg-rose-50/30 rounded-[40px] border border-rose-100/50">
                  <p className="text-rose-800/40 italic font-serif text-xl">Le cahier attend vos créations...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {contributions.filter(c => {
                    const matchesSearch = c.authorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                         (c.message?.toLowerCase().includes(searchQuery.toLowerCase()));
                    return matchesSearch;
                  }).map((item, idx) => (
                    <motion.div
                      key={`notebook-${item.id}-${idx}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (idx % 9) * 0.05 }}
                      className="group relative bg-white rounded-3xl border border-rose-100/50 overflow-hidden hover:shadow-xl hover:shadow-rose-100/50 transition-all duration-500 flex flex-col h-full"
                    >
                      <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <LikeButton 
                          count={likes[item.id] || 0}
                          onLike={() => handleLike(item.id)}
                          className="bg-white/90 shadow-sm"
                        />
                        {(isAdmin || (user && item.uid === user.uid)) && (
                          <>
                            {isAdmin && item.imageUrl && !item.isPdf && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRotate(item.imageUrl!); }}
                                className="p-2 bg-white/90 backdrop-blur-sm text-rose-400 hover:text-rose-600 rounded-full shadow-sm transition-all"
                                title="Faire pivoter"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => { setEditingId(item.id); setEditMessage(item.message || ''); }}
                              className="p-2 bg-white/90 backdrop-blur-sm text-rose-300 hover:text-rose-500 rounded-full shadow-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setConfirmDelete({id: item.id, type: 'contribution'})}
                              className="p-2 bg-white/90 backdrop-blur-sm text-rose-300 hover:text-rose-600 rounded-full shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {item.imageUrl && (
                        <div 
                          className="relative aspect-[4/3] overflow-hidden bg-rose-50/30 flex items-center justify-center cursor-zoom-in"
                          onClick={() => {
                            if (item.isPdf) {
                              window.open(item.pdfData || item.imageUrl, '_blank');
                              return;
                            }
                            const index = contributions.filter(c => c.imageUrl && !c.isPdf).findIndex(c => c.id === item.id);
                            setSelectedImageIndex(index);
                          }}
                        >
                          <img 
                            loading="lazy"
                            src={item.imageUrl} 
                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 rounded-2xl"
                            style={{ transform: `rotate(${rotations[item.imageUrl] || 0}deg)` }}
                            alt="" 
                          />
                          <div className="absolute inset-0 bg-rose-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            {item.isPdf ? <ExternalLink className="w-8 h-8 text-white" /> : <Search className="w-8 h-8 text-white" />}
                          </div>
                          {item.isPdf && (
                            <div className="absolute top-4 left-4 bg-rose-500 text-white p-2 rounded-xl shadow-lg">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Heart className="w-3 h-3 text-rose-300 fill-rose-300" />
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                            {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'd MMMM yyyy', { locale: fr }) : '...'}
                          </span>
                        </div>

                        {editingId === item.id ? (
                          <div className="space-y-4 mb-4">
                            <textarea
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                              className="w-full p-4 bg-rose-50/50 rounded-2xl border border-rose-100 focus:ring-2 focus:ring-rose-200 outline-none transition-all min-h-[100px] resize-none text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingId(null)} className="px-4 py-1 text-[10px] font-bold text-rose-400 hover:text-rose-600 uppercase tracking-widest">Annuler</button>
                              <button onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'contributions', item.id), { message: editMessage.trim() });
                                  setEditingId(null);
                                  toast.success("Mis à jour.");
                                  fetchData(true);
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.UPDATE, 'contributions');
                                }
                              }} className="px-4 py-1 text-[10px] font-bold bg-rose-500 text-white rounded-full hover:bg-rose-600 uppercase tracking-widest">OK</button>
                            </div>
                          </div>
                        ) : (
                          item.message && (
                            <p className="text-rose-800/80 italic leading-relaxed mb-4 flex-1 text-xs">
                              "{item.message}"
                            </p>
                          )
                        )}
                        
                        <div className="pt-3 border-t border-rose-50 flex justify-between items-center">
                          <span className="font-serif text-rose-900 font-medium text-xs">{item.authorName}</span>
                          <Heart className="w-3 h-3 text-rose-200 fill-rose-200" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {hasMoreContribs && (
                <div className="mt-12 flex justify-center">
                  <button 
                    onClick={loadMoreContributions}
                    disabled={isLoadingMoreContribs}
                    className="px-8 py-3 bg-rose-50 text-rose-500 rounded-full font-bold hover:bg-rose-100 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoadingMoreContribs ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      'Charger plus de contributions'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminDashboard && (
          <AdminDashboard 
            settings={settings}
            themes={themes}
            candleLibrary={candleLibrary}
            onClose={() => setShowAdminDashboard(false)}
            rotations={rotations}
            onRotate={handleRotate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImageIndex !== null && (
          <Lightbox 
            items={contributions.filter(c => c.imageUrl && !c.isPdf).map(c => ({ url: c.imageUrl!, id: c.id }))} 
            currentIndex={selectedImageIndex} 
            onClose={() => setSelectedImageIndex(null)}
            onPrev={() => setSelectedImageIndex(prev => prev !== null ? (prev - 1 + contributions.filter(c => c.imageUrl && !c.isPdf).length) % contributions.filter(c => c.imageUrl && !c.isPdf).length : null)}
            onNext={() => setSelectedImageIndex(prev => prev !== null ? (prev + 1) % contributions.filter(c => c.imageUrl && !c.isPdf).length : null)}
            likes={likes}
            onLike={handleLike}
            rotations={rotations}
            onRotate={handleRotate}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!confirmDelete}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={isDeleting}
      />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 space-y-32">
          {/* Thème en cours - Full Width */}
          <div className="w-full">
            <CurrentTheme 
              theme={currentTheme} 
              selectedYear={selectedThemeYear} 
              user={user} 
              onSuccess={triggerThankYouAnimation} 
            />
          </div>

          {/* Section Rituel de la Bougie */}
          <CandleRitualSection 
            user={user}
            candles={candles}
            candleLibrary={candleLibrary}
            isAdmin={isAdmin}
            onDelete={(id) => setConfirmDelete({ id, type: 'candle' })}
            likes={likes}
            onLike={handleLike}
            onSuccess={triggerThankYouAnimation}
            showCandlesModal={showCandlesModal}
            setShowCandlesModal={setShowCandlesModal}
          />

          {/* Section des Livres */}
          <div className="space-y-16">
            {/* Sélecteurs d'Années Alignés */}
            <div className="flex flex-col md:flex-row justify-center items-start gap-12 md:gap-32">
              {/* Sélecteur Jardin */}
              <div className="flex flex-col items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 text-rose-400">
                  <Folder className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Année du Jardin</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {availableYears.map(year => (
                    <button
                      key={`year-garden-${year}`}
                      onClick={() => setSelectedCandleYear(year)}
                      className={cn(
                        "px-5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm",
                        selectedCandleYear === year 
                          ? "bg-rose-500 text-white shadow-rose-200" 
                          : "bg-white text-rose-400 hover:bg-rose-50 border border-rose-100"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélecteur Cahier */}
              <div className="flex flex-col items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 text-rose-400">
                  <Folder className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Année du Cahier</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {availableYears.map(year => (
                    <button
                      key={`year-notebook-${year}`}
                      onClick={() => setSelectedThemeYear(year)}
                      className={cn(
                        "px-5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm",
                        selectedThemeYear === year 
                          ? "bg-rose-500 text-white shadow-rose-200" 
                          : "bg-white text-rose-400 hover:bg-rose-50 border border-rose-100"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grille des Livres Alignés */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-32 items-start">
              <div id="candles" className="flex justify-center">
                <CandleRitual 
                  candles={candles.filter(c => c.year === selectedCandleYear)} 
                  onOpenModal={() => setShowCandlesModal(true)}
                />
              </div>

              <div id="notebook" className="flex justify-center">
                <Notebook 
                  onOpenModal={() => setShowNotebookModal(true)}
                />
              </div>
            </div>
          </div>

          {/* Section Confidences */}
          <ConfidenceSection 
            user={user} 
            onOpenPrivate={() => setShowConfidencesModal(true)} 
          />
        </div>

      </main>

      <AnimatePresence>
        {showConfidencesModal && (
          <ConfidencesModal 
            user={user} 
            isOpen={showConfidencesModal} 
            onClose={() => setShowConfidencesModal(false)} 
          />
        )}
      </AnimatePresence>

      <CloudThankYou isVisible={showThankYou} />

      <Footer />
    </div>
  );
}
