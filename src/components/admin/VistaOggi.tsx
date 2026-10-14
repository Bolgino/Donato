"use client";
import { Candidato } from "@/types/admin";
import { CONFIG_TURNI, faseDi, fmtData, giorniDaOggi, iniziale, quando, SpuntaTurno, Turno } from "@/lib/donato";
import { Azioni, Vista } from "./tipi";
import { inPausa } from "./VistaDaContattare";
import { daRiscrivere, scadenzaPassata } from "./VistaCiPensano";

interface Compito {
  chiave: string;
  icona: string;
  titolo: string;
  testo: string;
  bottone: string;
  vista: Vista;
  urgente?: boolean;
}

export function calcolaCompiti(daContattare: Candidato[], turni: Turno[], pensano: Candidato[], spunte: Record<string, SpuntaTurno>): Compito[] {
  const out: Compito[] = [];
  const nuovi = daContattare.filter((c) => faseDi(c) === "da_contattare");
  const ricontattabili = daContattare.filter((c) => faseDi(c) === "da_ricontattare" && !inPausa(c));

  if (nuovi.length) {
    const nonSalvati = nuovi.filter((c) => !c.esportato_csv).length;
    out.push({
      chiave: "nuovi",
      icona: "💬",
      titolo: `Scrivi a ${nuovi.length} ${nuovi.length === 1 ? "nuova risposta" : "nuove risposte"}`,
      testo: `Manda il WhatsApp (è già scritto con le date libere) e quando rispondono mettili in un turno.${nonSalvati ? ` ${nonSalvati} non sono ancora in Google Contatti.` : ""}`,
      bottone: "Vai a Da contattare",
      vista: "contattare",
      urgente: true,
    });
  }
  if (ricontattabili.length) {
    out.push({
      chiave: "ricontattare",
      icona: "🔄",
      titolo: `Ricontatta ${ricontattabili.length} ${ricontattabili.length === 1 ? "persona" : "persone"}`,
      testo: "Avevi segnato di risentirle: ora è il momento.",
      bottone: "Vai a Da contattare",
      vista: "contattare",
    });
  }

  for (const t of turni) {
    if (t.data === "senza-data") {
      out.push({ chiave: "senza-data", icona: "⚠️", titolo: "Persone in turno senza data", testo: "Apri la pagina Turni e assegna una data.", bottone: "Vai ai Turni", vista: "turni", urgente: true });
      continue;
    }
    if (t.passato) continue;
    const s = spunte[t.data] || {};
    const giorno = fmtData(t.data, "giorno");
    const g = giorniDaOggi(t.data);
    if (t.daConfermare.length && !s.lista) {
      out.push({
        chiave: `lista-${t.data}`,
        icona: "📋",
        titolo: `Manda la lista di ${giorno} al trasfusionale`,
        testo: `${t.persone.length} ${t.persone.length === 1 ? "persona" : "persone"} (${quando(t.data)}). Apri la lista, fai uno screenshot e mandala.`,
        bottone: "Apri il turno",
        vista: "turni",
        urgente: g <= 7,
      });
    } else if (t.daConfermare.length) {
      out.push({
        chiave: `conferma-${t.data}`,
        icona: "⏳",
        titolo: `Aspetti la conferma per ${giorno}`,
        testo: "Quando il trasfusionale risponde, tocca “Conferma il turno”.",
        bottone: "Apri il turno",
        vista: "turni",
        urgente: g <= 3,
      });
    }
    if (t.confermati.length && !s.prof) {
      out.push({
        chiave: `prof-${t.data}`,
        icona: "🏫",
        titolo: `Avvisa i prof per ${giorno}`,
        testo: "Il messaggio con nomi e classi è già pronto per ogni scuola.",
        bottone: "Apri il turno",
        vista: "turni",
        urgente: g <= 3,
      });
    }
    if (t.confermati.length && g >= 0 && g <= 1) {
      out.push({
        chiave: `promemoria-${t.data}`,
        icona: "🔔",
        titolo: `${g === 0 ? "Oggi" : "Domani"} c'è il turno: manda il promemoria`,
        testo: "Nel turno, al passo 4, trovi un pulsante WhatsApp per ogni ragazzo.",
        bottone: "Apri il turno",
        vista: "turni",
        urgente: true,
      });
    }
  }

  const daSentire = pensano.filter((c) => daRiscrivere(c) || scadenzaPassata(c));
  if (daSentire.length) {
    out.push({
      chiave: "pensano",
      icona: "🤔",
      titolo: `${daSentire.length} ${daSentire.length === 1 ? "persona ci pensa" : "persone ci pensano"} da un po'`,
      testo: "Scrivigli per sapere se partecipano e imposta una scadenza per la risposta.",
      bottone: "Vai a Ci pensano",
      vista: "pensano",
    });
  }
  return out;
}

const PERCORSO: { icona: string; testo: string; vista: Vista }[] = [
  { icona: "📝", testo: "Arrivano le risposte", vista: "contattare" },
  { icona: "💬", testo: "Scrivi su WhatsApp", vista: "contattare" },
  { icona: "📅", testo: "Metti nel turno", vista: "contattare" },
  { icona: "📋", testo: "Lista al trasfusionale", vista: "turni" },
  { icona: "✅", testo: "Conferma il turno", vista: "turni" },
  { icona: "🏫", testo: "Avvisa i prof", vista: "turni" },
];

export default function VistaOggi({
  daContattare,
  turni,
  pensano,
  spunte,
  azioni,
}: {
  daContattare: Candidato[];
  turni: Turno[];
  pensano: Candidato[];
  spunte: Record<string, SpuntaTurno>;
  azioni: Azioni;
}) {
  const compiti = calcolaCompiti(daContattare, turni, pensano, spunte);
  const prossimi = turni.filter((t) => !t.passato && t.data !== "senza-data").slice(0, 4);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Il percorso */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Il percorso di ogni ragazzo</p>
        <ol className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PERCORSO.map((p, i) => (
            <li key={p.testo}>
              <button onClick={() => azioni.vaiA(p.vista)} className="w-full h-full text-center p-2 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-colors">
                <div className="text-xl">{p.icona}</div>
                <div className="text-[11px] font-bold text-slate-700 leading-tight mt-1">
                  {i + 1}. {p.testo}
                </div>
              </button>
            </li>
          ))}
        </ol>
        <button onClick={() => azioni.vaiA("guida")} className="text-xs font-bold text-red-600 underline mt-3">
          Leggi la guida completa →
        </button>
      </div>

      {/* Cosa fare */}
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-3">Cosa c&apos;è da fare</h3>
        {compiti.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-green-800">Tutto in ordine, niente da fare adesso.</p>
            <p className="text-sm text-green-700 mt-1">Quando arrivano nuove risposte o un turno ha bisogno di qualcosa, lo trovi qui.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {compiti.map((c) => (
              <li key={c.chiave} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 ${c.urgente ? "border-red-200" : "border-slate-200"}`}>
                <div className="text-2xl shrink-0 leading-none pt-0.5">{c.icona}</div>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{c.titolo}</p>
                    <p className="text-sm text-slate-500">{c.testo}</p>
                  </div>
                  <button onClick={() => azioni.vaiA(c.vista)} className="shrink-0 self-start sm:self-center bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">
                    {c.bottone} →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Prossimi turni */}
      {prossimi.length > 0 && (
        <div>
          <h3 className="text-lg font-black text-slate-800 mb-3">Prossimi turni</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prossimi.map((t) => (
              <li key={t.data}>
                <button onClick={() => azioni.vaiA("turni")} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-400">
                  <p className="font-bold text-slate-800">{iniziale(fmtData(t.data, "giorno"))}</p>
                  <p className="text-xs text-slate-500">
                    {quando(t.data)} · {t.persone.length}/{CONFIG_TURNI.postiPerTurno} posti ·{" "}
                    {t.daConfermare.length === 0 ? <span className="text-green-700 font-bold">confermato</span> : <span className="text-amber-700 font-bold">{t.daConfermare.length} da confermare</span>}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
