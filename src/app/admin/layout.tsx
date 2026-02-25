import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Donato Admin Dashboard',
  manifest: '/manifest.json', // Attiva l'installazione PWA
  themeColor: '#dc2626',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Donato Admin',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Configurazione globale delle notifiche */}
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
    </>
  );
}
