"use client";
import { useEffect, useState } from "react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // 1. Controllo immediato: L'app è già installata e in esecuzione come app?
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    // Se è già un'app, non facciamo nulla e il bottone resterà nascosto.
    if (isStandalone) {
      setIsInstallable(false);
      return;
    }

    // 2. Se siamo nel browser, ci mettiamo in ascolto dell'evento di installazione
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Impedisce al browser di mostrare il suo mini-banner automatico
      setDeferredPrompt(e); // Salviamo l'evento per usarlo quando si clicca il bottone
      setIsInstallable(true); // Mostriamo il bottone!
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Ascoltiamo anche se l'utente la installa con successo in questa sessione
    const handleAppInstalled = () => {
      setIsInstallable(false); // Nascondiamo subito il bottone appena l'installazione finisce
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Mostriamo il prompt nativo del telefono (Google/Android/Chrome)
      deferredPrompt.prompt();
      // Aspettiamo la scelta dell'utente
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false); // L'ha installata, nascondiamo il bottone
      }
      setDeferredPrompt(null);
    }
  };

  // Se non è installabile (o perché è già installata, o perché siamo su iPhone/Safari che blocca questo sistema)
  if (!isInstallable) return null;

  return (
    <button onClick={handleInstallClick} className="w-full flex items-center justify-center space-x-2 p-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors mt-4 shadow-lg shadow-red-600/30 mb-2">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      <span>Installa App</span>
    </button>
  );
}
