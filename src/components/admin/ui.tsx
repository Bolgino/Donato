"use client";
// Piccoli pezzi di interfaccia riusati in tutte le pagine dell'area admin.
import { ReactNode, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Candidato } from "@/types/admin";
import { blocchiOggi, isAspirante, isGiaDonatore, isNo, isPensarci, leggiPreferenza, scriviPreferenza } from "@/lib/donato";

export function TipoBadge({ tipo }: { tipo: string }) {
  if (isGiaDonatore(tipo)) return <span className="text-[10px] uppercase font-black tracking-wide px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">🩸 Già donatore</span>;
  if (isAspirante(tipo)) return <span className="text-[10px] uppercase font-black tracking-wide px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">🌱 Aspirante</span>;
  if (isPensarci(tipo)) return <span className="text-[10px] uppercase font-black tracking-wide px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 whitespace-nowrap">🤔 Ci pensa</span>;
  if (isNo(tipo)) return <span className="text-[10px] uppercase font-black tracking-wide px-2 py-0.5 rounded bg-slate-200 text-slate-600 border border-slate-300 whitespace-nowrap">No</span>;
  return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{tipo || "—"}</span>;
}

/** Bollini rossi: minorenne oggi, ha donato da poco */
export function BlocchiBadge({ c }: { c: Candidato }) {
  const b = blocchiOggi(c);
  if (b.length === 0) return null;
  return (
    <>
      {b.map((x) => (
        <span key={x.codice} title={x.testo} className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white whitespace-nowrap">
          {x.codice === "MINORENNE" ? "MINORENNE" : x.codice === "SOSPESO" ? "SOSPESO" : "NO DATA NASCITA"}
        </span>
      ))}
    </>
  );
}

export function EcgBadge({ v }: { v: boolean | null | undefined }) {
  if (v === null || v === undefined) return null;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${v ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
      ECG {v ? "sì" : "no"}
    </span>
  );
}

/** Riquadro "Cosa fare qui" richiudibile (lo stato resta salvato su questo dispositivo) */
export function Istruzioni({ id, titolo = "Cosa fare qui", children }: { id: string; titolo?: string; children: ReactNode }) {
  const [aperto, setAperto] = useState(true);
  useEffect(() => setAperto(leggiPreferenza("istr." + id, true)), [id]);
  const cambia = () => {
    setAperto(!aperto);
    scriviPreferenza("istr." + id, !aperto);
  };
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-900">
      <button onClick={cambia} className="w-full flex items-center justify-between px-4 py-3 font-bold text-left">
        <span>💡 {titolo}</span>
        <span className="text-xs font-semibold text-amber-700">{aperto ? "Nascondi" : "Mostra"}</span>
      </button>
      {aperto && <div className="px-4 pb-4 -mt-1 space-y-2 leading-relaxed">{children}</div>}
    </div>
  );
}

export function Vuoto({ icona = "📭", titolo, children }: { icona?: string; titolo: string; children?: ReactNode }) {
  return (
    <div className="bg-white p-10 text-center rounded-2xl border border-slate-200 shadow-sm">
      <div className="text-4xl mb-3">{icona}</div>
      <h3 className="text-base font-bold text-slate-700">{titolo}</h3>
      {children && <div className="text-slate-500 text-sm mt-2">{children}</div>}
    </div>
  );
}

export function Chip({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${attivo ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
    >
      {children}
    </button>
  );
}

const baseBtn = "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors whitespace-nowrap";

export function LinkWhatsApp({ href, children = "WhatsApp", grande = false }: { href: string | null; children?: ReactNode; grande?: boolean }) {
  if (!href) return <span className="text-[11px] text-slate-400 italic">numero non valido</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${baseBtn} bg-green-600 text-white hover:bg-green-700 ${grande ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs"}`}>
      <span aria-hidden>💬</span> {children}
    </a>
  );
}

export function LinkGmail({ href, children = "Email", grande = false }: { href: string | null; children?: ReactNode; grande?: boolean }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${baseBtn} bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 ${grande ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs"}`}>
      <span aria-hidden>✉️</span> {children}
    </a>
  );
}

export function Bottone({
  onClick,
  children,
  tipo = "secondario",
  grande = false,
  disabled = false,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  tipo?: "primario" | "secondario" | "pericolo" | "ok" | "blu";
  grande?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const colori = {
    primario: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    secondario: "bg-white text-slate-700 border border-slate-200 hover:border-slate-400",
    pericolo: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white",
    ok: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
    blu: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
  }[tipo];
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${baseBtn} ${colori} ${grande ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs"} disabled:opacity-40 disabled:cursor-not-allowed`}>
      {children}
    </button>
  );
}

/** Finestra di conferma (al posto di window.confirm) */
export function conferma(testo: string, ok = "Sì", pericolo = true): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="font-bold text-slate-800 text-sm">{testo}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className={`${pericolo ? "bg-red-600" : "bg-green-600"} text-white px-3 py-1.5 rounded-md text-xs font-bold`}
            >
              {ok}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200"
            >
              Annulla
            </button>
          </div>
        </div>
      ),
      { duration: 15000 },
    );
  });
}

/** Contenitore modale: a tutto schermo sul telefono, finestra centrata sul computer */
export function Modale({ onClose, children, larga = false }: { onClose: () => void; children: ReactNode; larga?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-center bg-slate-900/60 backdrop-blur-sm md:p-4" onClick={onClose}>
      <div
        className={`bg-white w-full ${larga ? "md:max-w-3xl" : "md:max-w-xl"} md:rounded-2xl shadow-2xl overflow-y-auto max-h-screen md:max-h-[92vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
