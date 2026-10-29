"use client";
import InstallPWA from "./InstallPWA";
import { Vista } from "./tipi";

interface SidebarProps {
  vistaAttiva: Vista;
  setVistaAttiva: (vista: Vista) => void;
  emailAmministratore: string;
  handleLogout: () => void;
  conteggi: Partial<Record<Vista, number>>;
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
}

export const VOCI_MENU: { id: Vista; nome: string; icona: string; descrizione: string; gruppo: "lavoro" | "strumenti" }[] = [
  { id: "oggi", nome: "Oggi", icona: "🏠", descrizione: "Cosa c'è da fare adesso", gruppo: "lavoro" },
  { id: "contattare", nome: "Da contattare", icona: "💬", descrizione: "Hanno detto sì: scrivigli e mettili in un turno", gruppo: "lavoro" },
  { id: "turni", nome: "Turni", icona: "📅", descrizione: "Messaggi ai ragazzi, conferme, foto a trasfusionale e prof", gruppo: "lavoro" },
  { id: "pensano", nome: "Ci pensano", icona: "🤔", descrizione: "Hanno risposto \"Voglio pensarci\"", gruppo: "lavoro" },
  { id: "rubrica", nome: "Rubrica prof", icona: "👩‍🏫", descrizione: "Referenti delle scuole", gruppo: "strumenti" },
  { id: "archivio", nome: "Archivio", icona: "🗂", descrizione: "Tutte le risposte ed export Excel", gruppo: "strumenti" },
  { id: "statistiche", nome: "Statistiche", icona: "📊", descrizione: "Accompagnati per anno e per scuola, risposte", gruppo: "strumenti" },
  { id: "domande", nome: "Domande dei ragazzi", icona: "🙋", descrizione: "Risposte pronte alle domande più frequenti", gruppo: "strumenti" },
  { id: "admin", nome: "Admin", icona: "👥", descrizione: "Chi può entrare: invita nuovi admin via email", gruppo: "strumenti" },
  { id: "guida", nome: "Guida", icona: "❓", descrizione: "Come funziona, passo per passo", gruppo: "strumenti" },
];

export default function Sidebar({ vistaAttiva, setVistaAttiva, emailAmministratore, handleLogout, conteggi, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const voce = (item: (typeof VOCI_MENU)[number]) => {
    const badge = conteggi[item.id];
    const attivo = vistaAttiva === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          setVistaAttiva(item.id);
          setIsMobileOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${attivo ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "hover:bg-slate-800 hover:text-white"}`}
      >
        <span className="flex items-center gap-3">
          <span className="text-lg w-6 text-center" aria-hidden>
            {item.icona}
          </span>
          <span className="font-medium text-sm">{item.nome}</span>
        </span>
        {badge !== undefined && badge > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${attivo ? "bg-white/20 text-white" : item.id === "oggi" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300"}`}>{badge}</span>
        )}
      </button>
    );
  };

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />}

      <aside
        className={`fixed md:relative z-50 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out shrink-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.ico" alt="Donato" className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
            <h1 className="text-xl font-bold text-white tracking-wide">
              Donato<span className="text-red-500">.</span>
            </h1>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white text-2xl px-2" aria-label="Chiudi menu">
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-1">Lavoro</p>
          {VOCI_MENU.filter((v) => v.gruppo === "lavoro").map(voce)}
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-5">Strumenti</p>
          {VOCI_MENU.filter((v) => v.gruppo === "strumenti").map(voce)}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-center mb-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest truncate block px-2">{emailAmministratore}</span>
          </div>
          <InstallPWA />
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium">Disconnetti</span>
          </button>
        </div>
      </aside>
    </>
  );
}
