import { Toaster } from 'react-hot-toast';
import PwaRegister from '@/components/admin/PwaRegister';

export const metadata = {
  title: 'Donato Admin Dashboard',
  manifest: '/manifest.json',
  themeColor: '#dc2626',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Donato',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister />
      {children}
      {/* Toast spostati in alto al centro */}
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </>
  );
}
