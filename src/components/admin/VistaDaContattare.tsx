"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Candidato } from "@/types/admin";
import {
  blocchiOggi,
  contiene,
  faseDi,
  fmtData,
  isGiaDonatore,
  linkWhatsApp,
  nato,
  nomeCompleto,
  oggiISO,
  quando,
  scaricaCsvGoogleContatti,
  soloData,
  statoDonatore,
} from "@/lib/donato";
import { Azioni } from "./tipi";
import { BlocchiBadge, Bottone, Chip, EcgBadge, Istruzioni, LinkWhatsApp, TipoBadge, Vuoto } from "./ui";

type Filtro = "tutti" | "nuovi" | "donatori" | "ricontattare";

/** In pausa = da ricontattare, ma non prima di una data futura */
export function inPausa(c: Candidato): boolean {
  return faseDi(c) === "da_ricontattare" && !!c.data_ricontatto && soloData(c.data_ricontatto) > oggiISO();
}

function priorita(c: Candidato): number {
  if (c.shift_status === "In Attesa") return 0;
  if (faseDi(c) === "da_contattare") return 1;
  if (!inPausa(c)) return 2;
  return 3;
}

export function ordinaDaContattare(lista: Candidato[]): Candidato[] {
  return [...lista].sort((a, b) => priorita(a) - priorita(b) || a.created_at.localeCompare(b.created_at));
}

export default function VistaDaContattare({
  lista,
  tutti,
  azioni,
  ricerca,
}: {
  lista: Candidato[];
  tutti: Candidato[];
  azioni: Azioni;
  ricerca: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());

  const conteggi = {
    tutti: lista.length,
    nuovi: lista.filter((c) => faseDi(c) === "da_contattare" && !isGiaDonatore(c.tipo_adesione)).length,
    donatori: lista.filter((c) => isGiaDonatore(c.tipo_adesione)).length,
    ricontattare: lista.filter((c) => faseDi(c) === "da_ricontattare").length,
  };

  const mostrati = ordinaDaContattare(
    lista.filter((c) => {
      if (!contiene(c, ricerca)) return false;
      if (filtro === "nuovi") return faseDi(c) === "da_contattare" && !isGiaDonatore(c.tipo_adesione);
      if (filtro === "donatori") return isGiaDonatore(c.tipo_adesione);
      if (filtro === "ricontattare") return faseDi(c) === "da_ricontattare";
      return true;
    }),
  );
  const nonEsportati = mostrati.filter((c) => !c.esportato_csv);

  const toggle = (id: string) => {
    const s = new Set(selezionati);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelezionati(s);
  };

  const esporta = async () => {
    const scelti = mostrati.filter((c) => selezionati.has(c.id));
    if (scelti.length === 0) return toast.error("Seleziona almeno una persona spuntando le caselle.");
    scaricaCsvGoogleContatti(scelti);
    const ok = await azioni.aggiornaMolti(
      scelti.map((c) => c.id),
      { esportato_csv: true },
      `Scaricati ${scelti.length} contatti: ora vai su contacts.google.com → Importa`,
    );
    if (ok) setSelezionati(new Set());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Istruzioni id="contattare">
        <p>
          Qui ci sono le persone che hanno detto <b>sì</b> nel modulo e non sono ancora in un turno.
        </p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>
            Tocca <b>📅 Metti in turno</b> e scegli la data (tra quelle già concordate con il trasfusionale). Il ragazzo passa nella pagina <b>Turni</b>.
          </li>
          <li>
            Subito dopo, nella scheda (o in Turni accanto al nome) tocca <b>💬 WhatsApp</b>: si apre il messaggio già scritto con la data. Mandalo insieme ai{" "}
            <b>📎 2 file ULSS</b> (modulo pre-donazione e modulo sospensione).
          </li>
          <li>
            Quando ti risponde che c&apos;è, in <b>Turni</b> tocca <b>✅ Segna confermato</b>. Se non può in quella data, spostalo; se non risponde, <b>🔄 Non risponde / più
            avanti</b> (puoi indicare da quando ricontattarlo).
          </li>
        </ol>
        <p className="text-xs">
          I nomi in <span className="text-red-600 font-bold">rosso</span> oggi non possono andare (minorenni o hanno donato da meno di 3 mesi): nella scheda vedi da quando potranno.
        </p>
      </Istruzioni>

      <div className="flex flex-wrap gap-2">
        <Chip attivo={filtro === "tutti"} onClick={() => setFiltro("tutti")}>
          Tutti ({conteggi.tutti})
        </Chip>
        <Chip attivo={filtro === "nuovi"} onClick={() => setFiltro("nuovi")}>
          🌱 Nuovi ({conteggi.nuovi})
        </Chip>
        <Chip attivo={filtro === "donatori"} onClick={() => setFiltro("donatori")}>
          🩸 Già donatori ({conteggi.donatori})
        </Chip>
        <Chip attivo={filtro === "ricontattare"} onClick={() => setFiltro("ricontattare")}>
          🔄 Da ricontattare ({conteggi.ricontattare})
        </Chip>
      </div>

      {/* Esportazione Google Contatti */}
      {mostrati.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-600 mr-1">📇 Google Contatti:</span>
          <Bottone onClick={() => setSelezionati(new Set(nonEsportati.map((c) => c.id)))} disabled={nonEsportati.length === 0}>
            Seleziona i non salvati ({nonEsportati.length})
          </Bottone>
          {selezionati.size > 0 && <Bottone onClick={() => setSelezionati(new Set())}>Deseleziona</Bottone>}
          <Bottone tipo="blu" onClick={esporta} disabled={selezionati.size === 0}>
            📥 Scarica file ({selezionati.size})
          </Bottone>
          <span className="text-slate-400 basis-full sm:basis-auto">poi contacts.google.com → Importa</span>
        </div>
      )}

      {mostrati.length === 0 ? (
        <Vuoto icona="🎉" titolo={ricerca ? "Nessun risultato per la ricerca." : "Nessuno da contattare."}>
          Quando arrivano nuove risposte dal modulo le trovi qui.
        </Vuoto>
      ) : (
        <ul className="space-y-2">
          {mostrati.map((c) => {
            const pausa = inPausa(c);
            const rosso = blocchiOggi(c).length > 0;
            const sd = statoDonatore(c);
            return (
              <li key={c.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4 flex gap-3 ${pausa ? "opacity-60" : ""}`}>
                <input
                  type="checkbox"
                  checked={selezionati.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="mt-1.5 w-4 h-4 accent-red-600 shrink-0 cursor-pointer"
                  aria-label="Seleziona per Google Contatti"
                />
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button onClick={() => azioni.apriScheda(c.id)} className={`font-extrabold text-base text-left hover:underline ${rosso ? "text-red-600" : "text-slate-800"}`}>
                      {nomeCompleto(c)}
                    </button>
                    <TipoBadge tipo={c.tipo_adesione} />
                    <BlocchiBadge c={c} />
                    <EcgBadge v={c.ha_fatto_ecg} />
                    {!c.esportato_csv && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">📇 non salvato</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {c.istituto}
                    {c.classe ? ` · ${c.classe}` : ""} · {nato(c.sesso)} il {fmtData(c.data_nascita) || "—"} · risposta di {quando(c.created_at)}
                  </p>
                  {faseDi(c) === "da_ricontattare" && (
                    <p className="text-[11px] mt-1.5 inline-block bg-yellow-50 border border-yellow-200 text-yellow-900 rounded px-2 py-0.5">
                      🔄 {c.data_ricontatto ? `${pausa ? "Ricontattare dal" : "Ricontattabile dal"} ${fmtData(c.data_ricontatto)}` : "Da ricontattare"}
                      {c.note_ricontatto ? ` · ${c.note_ricontatto}` : ""}
                    </p>
                  )}
                  {isGiaDonatore(c.tipo_adesione) && c.data_ultima_donazione && (
                    <p className="text-[11px] mt-1 text-blue-800">
                      🩸 Ultima donazione {fmtData(c.data_ultima_donazione)}
                      {sd.recente && <span className="text-red-600 font-bold"> · attesa 3 mesi (fino al {fmtData(sd.sblocco)})</span>}
                      {sd.scaduto && <span className="text-orange-600 font-bold"> · più di 2 anni fa: tornerà aspirante</span>}
                    </p>
                  )}
                  {c.note && <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">“{c.note}”</p>}
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0 sm:items-stretch">
                  <LinkWhatsApp href={linkWhatsApp(c.cellulare)}>Chat</LinkWhatsApp>
                  <Bottone tipo="primario" onClick={() => azioni.apriScheda(c.id)}>
                    📅 Metti in turno
                  </Bottone>
                </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
