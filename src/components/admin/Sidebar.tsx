"use client";
import React from 'react';
import InstallPWA from './InstallPWA'; 

interface SidebarProps {
  vistaAttiva: string;
  setVistaAttivo: (vista: string) => void;
  emailAmministratore: string;
  handleLogout: () => void;
  conteggi: {
    inGestione: number;
    giaDonatori: number;
    pending: number;
    confermati: number;
    pensarci: number;
    rifiutati: number; // MANCAVA QUESTO!
    archivio: number;
  };
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
}

export default function Sidebar({ vistaAttiva, setVistaAttivo, emailAmministratore, handleLogout, conteggi, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const menuItems = [
    { nome: "Dashboard", icona: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { nome: "In Gestione", badge: conteggi.inGestione, icona: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { nome: "Già Donatori", badge: conteggi.giaDonatori, icona: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { nome: "Pending", badge: conteggi.pending, icona: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { nome: "Visite Confermate", badge: conteggi.confermati, icona: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { nome: "Ci voglio pensare", badge: conteggi.pensarci, icona: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { nome: "Rifiutati (No)", badge: conteggi.rifiutati, icona: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
    { nome: "Archivio", badge: conteggi.archivio, icona: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
    { nome: "Rubrica Prof", icona: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" }
  ];

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />}

      <aside className={`fixed md:relative z-50 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/favicon.ico" alt="Donato" className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
            <h1 className="text-xl font-bold text-white tracking-wide">Donato<span className="text-red-500">.</span></h1>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white text-2xl px-2">✕</button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">Menu</p>
          {menuItems.map((item) => (
            <button key={item.nome} onClick={() => { setVistaAttivo(item.nome); setIsMobileOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${vistaAttiva === item.nome ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icona} /></svg>
                <span className="font-medium text-sm">{item.nome}</span>
              </div>
              {item.badge !== undefined && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vistaAttiva === item.nome ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="text-center mb-3"><span className="text-[10px] text-slate-500 uppercase tracking-widest truncate block px-2">{emailAmministratore}</span></div>
          <InstallPWA /> 
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="text-sm font-medium">Disconnetti</span>
          </button>
        </div>
      </aside>
    </>
  );
}
