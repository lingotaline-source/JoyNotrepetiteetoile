import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const PasswordGate = ({ onAuthorized, correctPassword }: { onAuthorized: () => void, correctPassword?: string }) => {
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
