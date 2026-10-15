"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Professore } from "@/types/admin";
import { copiaTesto, emailValida, linkGmail, linkWhatsApp, normScuola, profPerScuola } from "@/lib/donato";
import { msgInvitoProf, oggettoInvitoProf } from "@/lib/messaggi";
import { SCUOLE } from "@/lib/scuole";
import { Bottone, conferma, Istruzioni, LinkGmail, LinkWhatsApp, Vuoto } from "./ui";

export default function VistaRubrica({
  profs,
  ricerca,
  salva,
  elimina,
  anno,
  invitati,
  setInvitati,
}: {
  profs: Professore[];
  ricerca: string;
  salva: (p: Partial<Professore>) => Promise<boolean>;
  elimina: (id: string) => Promise<boolean>;
  /** Anno scolastico in corso, es. 2026-2027 */
  anno: string;
  /** Già chiesto ai prof se partecipano quest'anno? */
  invitati: boolean;
  setInvitati: (v: boolean) => void;
}) {
  const [mostraInvito, setMostraInvito] = useState(false);
  const [modifica, setModifica] = useState<Partial<Professore> | null>(null);
  const scuoleModulo = SCUOLE.filter((s) => s !== "Altro");
  const q = ricerca.toLowerCase().trim();
  const mostrati = profs.filter((p) => !q || `${p.scuola} ${p.nome} ${p.cognome} ${p.mail}`.toLowerCase().includes(q));

  const onSalva = async () => {
    if (!modifica?.scuola) return toast.error("La scuola è obbligatoria");
    if (await salva(modifica)) setModifica(null);
  };

  const onElimina = async (p: Professore) => {
    if (await conferma(`Eliminare ${p.nome} ${p.cognome} (${p.scuola}) dalla rubrica?`, "Elimina")) await elimina(p.id);
  };

  const abbinata = (p: Professore) => scuoleModulo.some((s) => profPerScuola([p], s).length > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Istruzioni id="rubrica">
        <p>
          I professori referenti di ogni scuola. Servono a <b>inizio anno</b> per chiedere se la scuola partecipa al progetto (riquadro 📣 qui sotto) e nella pagina Turni
          per mandare i nominativi dei ragazzi già scritti.
        </p>
        <p>
          Scrivi il nome della <b>scuola uguale a quello del modulo</b> (te lo suggerisce mentre scrivi): così il prof viene abbinato da solo ai suoi studenti.
        </p>
      </Istruzioni>

      {/* Inizio anno: chiedere ai prof se la scuola partecipa */}
      <div className={`rounded-2xl border p-4 space-y-3 ${invitati ? "bg-green-50 border-green-200" : "bg-white border-red-200 shadow-sm"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800">📣 Inizio anno {anno}: chiedi ai prof se partecipano</h3>
            <p className="text-xs text-slate-500">
              {invitati ? "Fatto ✓ — i messaggi restano qui se ti servono di nuovo." : "Primo passo dell'anno: un messaggio a ogni referente per sapere se la scuola aderisce al Progetto Scuole."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {invitati && (
              <button onClick={() => setMostraInvito(!mostraInvito)} className="text-xs font-bold text-slate-500 underline">
                {mostraInvito ? "Nascondi" : "Mostra messaggi"}
              </button>
            )}
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={invitati} onChange={(e) => setInvitati(e.target.checked)} className="w-4 h-4 accent-green-600" />
              Fatto per il {anno}
            </label>
          </div>
        </div>
        {(!invitati || mostraInvito) &&
          (profs.length === 0 ? (
            <p className="text-xs text-slate-500">Aggiungi prima i referenti qui sotto con &quot;+ Nuovo&quot;.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {profs.map((p) => {
                const testo = msgInvitoProf(p, anno);
                return (
                  <li key={p.id} className="py-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 flex-1 min-w-[160px]">
                      {p.nome} {p.cognome} <span className="text-[11px] font-bold text-red-600 uppercase">{p.scuola}</span>
                    </span>
                    {p.cell && <LinkWhatsApp href={linkWhatsApp(p.cell, testo)} />}
                    <LinkGmail href={emailValida(p.mail) ? linkGmail(p.mail, oggettoInvitoProf(anno), testo) : null} />
                    <button
                      onClick={async () => ((await copiaTesto(testo)) ? toast.success("Messaggio copiato") : toast.error("Non sono riuscito a copiare"))}
                      className="text-[11px] font-bold text-slate-500 underline"
                    >
                      Copia testo
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-800">Contatti referenti</h3>
          <p className="text-slate-500 text-xs">{profs.length} in rubrica</p>
        </div>
        <Bottone tipo="primario" grande onClick={() => setModifica({ scuola: "", nome: "", cognome: "", mail: "", cell: "" })}>
          + Nuovo
        </Bottone>
      </div>

      {modifica && (
        <div className="bg-white p-5 rounded-2xl shadow-xl border-2 border-red-500">
          <h3 className="font-black text-slate-800 mb-4">{modifica.id ? "Modifica professore" : "Aggiungi professore"}</h3>
          <datalist id="elenco-scuole">
            {scuoleModulo.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              list="elenco-scuole"
              placeholder="Scuola *"
              value={modifica.scuola || ""}
              onChange={(e) => setModifica({ ...modifica, scuola: e.target.value })}
              className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm font-bold"
            />
            <input placeholder="Nome" value={modifica.nome || ""} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
            <input placeholder="Cognome" value={modifica.cognome || ""} onChange={(e) => setModifica({ ...modifica, cognome: e.target.value })} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
            <input placeholder="Cellulare" value={modifica.cell || ""} onChange={(e) => setModifica({ ...modifica, cell: e.target.value })} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
            <input placeholder="Email" value={modifica.mail || ""} onChange={(e) => setModifica({ ...modifica, mail: e.target.value })} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
          </div>
          {modifica.scuola && !scuoleModulo.some((s) => normScuola(s) === normScuola(modifica.scuola)) && (
            <p className="text-xs text-orange-700 mt-2">⚠️ Questo nome non è identico a una scuola del modulo: controlla che l&apos;abbinamento funzioni.</p>
          )}
          <div className="flex flex-col md:flex-row gap-2 mt-5">
            <Bottone tipo="primario" grande onClick={onSalva}>
              Salva
            </Bottone>
            <Bottone grande onClick={() => setModifica(null)}>
              Annulla
            </Bottone>
          </div>
        </div>
      )}

      {mostrati.length === 0 ? (
        <Vuoto icona="👩‍🏫" titolo="Nessun professore in rubrica." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mostrati.map((prof) => (
            <div key={prof.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center font-black text-lg border border-red-100 shrink-0">
                    {(prof.nome || prof.scuola || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 leading-tight truncate">
                      {prof.nome} {prof.cognome}
                    </h3>
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{prof.scuola}</span>
                    {!abbinata(prof) && <p className="text-[10px] text-orange-600 font-semibold">⚠️ scuola non abbinata al modulo</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setModifica(prof)} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 border border-blue-100 text-xs" aria-label="Modifica">
                    ✏️
                  </button>
                  <button onClick={() => onElimina(prof)} className="text-red-600 bg-red-50 p-2 rounded-lg hover:bg-red-100 border border-red-100 text-xs" aria-label="Elimina">
                    🗑️
                  </button>
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-slate-100 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">{prof.cell || <span className="text-slate-400 text-xs">Nessun cellulare</span>}</span>
                  {prof.cell && <LinkWhatsApp href={linkWhatsApp(prof.cell)} />}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 truncate">{prof.mail || <span className="text-slate-400">Nessuna email</span>}</span>
                  <LinkGmail href={emailValida(prof.mail) ? linkGmail(prof.mail) : null} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
