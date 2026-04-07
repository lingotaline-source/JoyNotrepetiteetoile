import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, startAfter, setDoc, doc, updateDoc, increment, deleteDoc, serverTimestamp, getDocFromServer, where, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Contribution, Candle, Confidence, Theme, CandleLibraryItem, GlobalSettings, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreError';
import { getUrlHash } from '../lib/helpers';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export function useAppData() {
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
  
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showCandlesModal, setShowCandlesModal] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [showConfidencesModal, setShowConfidencesModal] = useState(false);
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
  const [pendingWrites, setPendingWrites] = useState<Set<string>>(new Set());
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  // Atmosphere State
  const [showParticles, setShowParticles] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

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

      // 3. Likes
      const likesSnapshot = await getDocs(collection(db, 'likes'));
      const likesData: Record<string, number> = {};
      likesSnapshot.forEach(doc => {
        likesData[doc.id] = doc.data().count;
      });
      setLikes(likesData);

      // 4. Rotations
      const rotationsSnapshot = await getDocs(collection(db, 'rotations'));
      const rotationsData: Record<string, number> = {};
      rotationsSnapshot.forEach(doc => {
        rotationsData[doc.data().url] = doc.data().rotation;
      });
      setRotations(rotationsData);

      if (contribSnapshot.docs.length > 0) {
        setLastVisibleContrib(contribSnapshot.docs[contribSnapshot.docs.length - 1]);
        setHasMoreContribs(contribSnapshot.docs.length === 15);
      } else {
        setHasMoreContribs(false);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreContributions = async () => {
    if (!lastVisibleContrib || !hasMoreContribs || isLoadingMoreContribs) return;
    
    setIsLoadingMoreContribs(true);
    try {
      const q = query(
        collection(db, 'contributions'), 
        orderBy('createdAt', 'desc'), 
        startAfter(lastVisibleContrib),
        limit(15)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution));
        setContributions(prev => [...prev, ...newItems]);
        setLastVisibleContrib(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreContribs(snapshot.docs.length === 15);
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

  const handleRotate = async (url: string) => {
    if (pendingWrites.has(url)) return;
    
    const currentRotation = rotations[url] || 0;
    const nextRotation = (currentRotation + 90) % 360;
    
    // Optimistic update
    setRotations(prev => ({ ...prev, [url]: nextRotation }));
    setPendingWrites(prev => new Set(prev).add(url));
    
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
            console.error("Failed to bootstrap theme", e);
          }
        }
      };
      bootstrapThemes();
    }
  }, [isAuthReady, themes.length]);

  return {
    user,
    setUser,
    contributions,
    setContributions,
    hasMoreContribs,
    isLoadingMoreContribs,
    isAuthReady,
    candles,
    confidences,
    themes,
    candleLibrary,
    settings,
    selectedCandleYear,
    setSelectedCandleYear,
    selectedThemeYear,
    setSelectedThemeYear,
    showAdminDashboard,
    setShowAdminDashboard,
    showCandlesModal,
    setShowCandlesModal,
    showNotebookModal,
    setShowNotebookModal,
    showConfidencesModal,
    setShowConfidencesModal,
    searchQuery,
    setSearchQuery,
    activeCandleId,
    setActiveCandleId,
    editingId,
    setEditingId,
    editMessage,
    setEditMessage,
    editPrayer,
    setEditPrayer,
    selectedImageIndex,
    setSelectedImageIndex,
    isAuthorized,
    setIsAuthorized,
    confirmDelete,
    setConfirmDelete,
    isDeleting,
    isLoading,
    likes,
    rotations,
    showPDFExport,
    setShowPDFExport,
    showThankYou,
    showParticles,
    isMusicPlaying,
    setIsMusicPlaying,
    volume,
    setVolume,
    fetchData,
    loadMoreContributions,
    handleRotate,
    triggerThankYouAnimation,
    handleLike,
    handleDeleteConfirm
  };
}
