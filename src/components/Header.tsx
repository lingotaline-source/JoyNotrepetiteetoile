import React from 'react';
import { User } from 'firebase/auth';
import { Heart, RefreshCw, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { ADMIN_EMAILS } from '../constants';

export const Header = ({ user, onLogin, onLogout, onToggleAdmin, onRefresh, isLoading }: { 
  user: User | null, 
  onLogin: () => void, 
  onLogout: () => void, 
  onToggleAdmin: () => void, 
  onRefresh: () => void,
  isLoading: boolean
}) => {
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email) && user.emailVerified;
  
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
