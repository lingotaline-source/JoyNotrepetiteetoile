export interface Contribution {
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

export interface Candle {
  id: string;
  authorName: string;
  prayer?: string;
  candleUrl?: string;
  year: number;
  createdAt: any;
  uid: string;
  likesCount?: number;
}

export interface Confidence {
  id: string;
  authorName: string;
  content: string;
  isPublic: boolean;
  authorId: string;
  createdAt: any;
  likesCount?: number;
}

export interface Theme {
  id: string;
  year: number;
  title: string;
  description: string;
  imageUrl: string;
  downloadUrl?: string;
  age: number;
}

export interface CandleLibraryItem {
  id: string;
  imageUrl: string;
  createdAt: any;
}

export interface GlobalSettings {
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
