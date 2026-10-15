"use client";
import { ReactNode, useState } from "react";
import toast from "react-hot-toast";
import { Candidato, Professore } from "@/types/admin";
import {
  CONFIG_TURNI,
  contiene,
  copiaTesto,
  emailValida,
  fmtData,
  giorniDaOggi,
  iniziale,
  isGiaDonatore,
  linkGmail,
  linkWhatsApp,
  linkWhatsAppLibero,
  maiuscolaIniziale,
  nato,
  nomeCompleto,
  normScuola,
  profPerScuola,
  quando,
  sessoBreve,
  SpuntaTurno,
  Turno,
} from "@/lib/donato";
import { msgConfermato, msgInserito, msgListaTrasfusionale, msgPromemoria, msgProf, NOME_PROGETTO, oggettoProf } from "@/lib/messaggi";
import { Azioni } from "./tipi";
import { FormTogli } from "./SchedaPersona";
import { Bottone, EcgBadge, Istruzioni, LinkGmail, LinkWhatsApp, Modale, TipoBadge, Vuoto } from "./ui";

async function copia(testo: string, cosa = "Testo") {
  if (await copiaTesto(testo)) toast.success(`${cosa} copiato: incollalo dove ti serve`);
  else toast.error("Non sono riuscito a copiare. Seleziona il testo a mano.");
}

// ---------------------------------------------------------------
// Foglio pulito da fotografare / mandare al trasfusionale
// ---------------------------------------------------------------
function FoglioTrasfusionale({ t, onClose, onInviata }: { t: Turno; onClose: () => void; onInviata: () => void }) {
  const [conTelefono, setConTelefono] = useState(false);
  const testo = msgListaTrasfusionale(t, conTelefono);
  const puoCondividere = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const condividi = async () => {
    try {
      await navigator.share({ title: `Turno ${fmtData(t.data)}`, text: testo });
    } catch {
      /* annullato */
    }
  };

  return (
    <Modale onClose={onClose} larga>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-slate-500">
            📸 Fai uno <b>screenshot</b> di questa schermata e mandalo al trasfusionale, oppure usa <b>Copia testo</b> / <b>Invia</b>.
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 text-2xl leading-none px-1" aria-label="Chiudi">
            ✕
          </button>
        </div>

        {t.daConfermare.length > 0 && (
          <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2">
            ⚠️ {t.daConfermare.length} {t.daConfermare.length === 1 ? "ragazzo non ha" : "ragazzi non hanno"} ancora confermato e non{" "}
            {t.daConfermare.length === 1 ? "è" : "sono"} in questa lista: {t.daConfermare.map((c) => nomeCompleto(c)).join(", ")}.
          </p>
        )}

        {/* Il foglio */}
        <div className="border-2 border-slate-800 rounded-xl p-4 md:p-6 bg-white">
          <p className="text-[11px] font-black uppercase tracking-widest text-red-600">{NOME_PROGETTO}</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">Turno di {fmtData(t.data, "lunga")}</h3>
          <p className="text-xs text-slate-500 mb-4">
            {CONFIG_TURNI.luogo} · {t.confermati.length} {t.confermati.length === 1 ? "persona" : "persone"}
          </p>
          {/* Telefono: elenco a righe, così entra tutto nello screenshot */}
          <ol className="sm:hidden divide-y divide-slate-200 border-t-2 border-slate-800">
            {t.confermati.map((c, i) => (
              <li key={c.id} className="py-2.5">
                <p className="font-black text-slate-900 text-base">
                  <span className="text-slate-400 font-bold mr-1.5">{i + 1}.</span>
                  {(c.cognome || "").toUpperCase()} {maiuscolaIniziale(c.nome)}
                </p>
                <p className="text-xs text-slate-700 mt-0.5">
                  {[
                    c.data_nascita ? `${nato(c.sesso)} il ${fmtData(c.data_nascita)}` : "",
                    sessoBreve(c.sesso),
                    isGiaDonatore(c.tipo_adesione) ? "già donatore" : "aspirante",
                    c.ha_fatto_ecg === null || c.ha_fatto_ecg === undefined ? "" : `ECG ${c.ha_fatto_ecg ? "sì" : "no"}`,
                    conTelefono ? c.cellulare : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ol>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[11px] uppercase tracking-wide text-slate-600">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Cognome e nome</th>
                  <th className="py-2 pr-2">Data di nascita</th>
                  <th className="py-2 pr-2">Sesso</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">ECG</th>
                  {conTelefono && <th className="py-2">Cellulare</th>}
                </tr>
              </thead>
              <tbody>
                {t.confermati.map((c, i) => (
                  <tr key={c.id} className="border-b border-slate-200">
                    <td className="py-2.5 pr-2 font-bold text-slate-400">{i + 1}</td>
                    <td className="py-2.5 pr-2 font-black text-slate-900 text-base">
                      {(c.cognome || "").toUpperCase()} {maiuscolaIniziale(c.nome)}
                    </td>
                    <td className="py-2.5 pr-2 whitespace-nowrap">{fmtData(c.data_nascita) || "—"}</td>
                    <td className="py-2.5 pr-2">{sessoBreve(c.sesso) || "—"}</td>
                    <td className="py-2.5 pr-2 whitespace-nowrap">{isGiaDonatore(c.tipo_adesione) ? "Già donatore" : "Aspirante"}</td>
                    <td className="py-2.5 pr-2">{c.ha_fatto_ecg === null || c.ha_fatto_ecg === undefined ? "—" : c.ha_fatto_ecg ? "Sì" : "No"}</td>
                    {conTelefono && <td className="py-2.5 whitespace-nowrap">{c.cellulare}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={conTelefono} onChange={(e) => setConTelefono(e.target.checked)} className="w-4 h-4 accent-red-600" />
          Aggiungi anche il cellulare (solo se il trasfusionale lo chiede)
        </label>

        <div className="flex flex-wrap gap-2">
          <Bottone grande onClick={() => copia(testo, "Elenco")}>
            📋 Copia testo
          </Bottone>
          {puoCondividere ? (
            <Bottone grande onClick={condividi}>
              📤 Condividi…
            </Bottone>
          ) : (
            <LinkWhatsApp href={linkWhatsAppLibero(testo)} grande>
              Invia su WhatsApp
            </LinkWhatsApp>
          )}
          <Bottone
            grande
            tipo="ok"
            onClick={() => {
              onInviata();
              onClose();
            }}
          >
            ✓ Fatto, l&apos;ho mandata
          </Bottone>
        </div>
      </div>
    </Modale>
  );
}

// ---------------------------------------------------------------
// Un passo della checklist del turno
// ---------------------------------------------------------------
function Passo({
  n,
  titolo,
  fatto,
  spento = false,
  children,
}: {
  n: number;
  titolo: string;
  fatto: boolean;
  spento?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex gap-3 ${spento ? "opacity-50" : ""}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
          fatto ? "bg-green-600 text-white" : "bg-white border-2 border-slate-300 text-slate-500"
        }`}
      >
        {fatto ? "✓" : n}
      </div>
      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
        <p className={`font-bold text-sm ${fatto ? "text-green-700" : "text-slate-800"}`}>{titolo}</p>
        {children}
      </div>
    </div>
  );
}

function CasellaFatto({ checked, onChange, testo = "Fatto" }: { checked: boolean; onChange: (v: boolean) => void; testo?: string }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-green-600" />
      {testo}
    </label>
  );
}

// ---------------------------------------------------------------
// Avviso ai professori, raggruppato per scuola
// ---------------------------------------------------------------
function AvvisoProf({ t, profs, azioni }: { t: Turno; profs: Professore[]; azioni: Azioni }) {
  const gruppi: Record<string, { scuola: string; studenti: Candidato[] }> = {};
  for (const c of t.confermati) {
    const k = normScuola(c.istituto) || "nessuna";
    (gruppi[k] = gruppi[k] || { scuola: c.istituto || "Scuola non indicata", studenti: [] }).studenti.push(c);
  }
  return (
    <div className="space-y-2">
      {Object.values(gruppi).map(({ scuola, studenti }) => {
        const profScuola = profPerScuola(profs, scuola);
        return (
          <div key={scuola} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-sm text-slate-800">🏫 {scuola}</p>
              <button onClick={() => copia(msgProf(profScuola[0] || null, scuola, t.data, studenti), "Messaggio")} className="text-[11px] font-bold text-slate-500 underline">
                Copia testo
              </button>
            </div>
            <p className="text-xs text-slate-600">{studenti.map((s) => `${nomeCompleto(s)}${s.classe ? ` (${s.classe})` : ""}`).join(", ")}</p>
            {profScuola.length === 0 ? (
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2">
                Nessun prof in rubrica per questa scuola.{" "}
                <button onClick={() => azioni.vaiA("rubrica")} className="font-bold underline">
                  Aggiungilo nella Rubrica
                </button>{" "}
                (scrivi il nome della scuola uguale a quello del modulo) oppure usa &quot;Copia testo&quot;.
              </p>
            ) : (
              profScuola.map((p) => {
                const testo = msgProf(p, scuola, t.data, studenti);
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 mr-1">
                      prof. {p.nome} {p.cognome}
                    </span>
                    {p.cell && <LinkWhatsApp href={linkWhatsApp(p.cell, testo)} />}
                    <LinkGmail href={emailValida(p.mail) ? linkGmail(p.mail, oggettoProf(t.data), testo) : null} />
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// Una persona nel turno: conferma o togli, una alla volta
// ---------------------------------------------------------------
function RigaTurno({ c, azioni }: { c: Candidato; azioni: Azioni }) {
  const [togli, setTogli] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const confermato = c.shift_status === "Confermato";
  const testo = confermato ? msgConfermato(c, c.data_disponibilita) : msgInserito(c, c.data_disponibilita);

  const cambiaStato = async (stato: "Confermato" | "Contattato") => {
    setInCorso(true);
    await azioni.aggiorna(c.id, { shift_status: stato }, stato === "Confermato" ? `${nomeCompleto(c)} confermato` : `Conferma di ${nomeCompleto(c)} annullata`);
    setInCorso(false);
  };

  return (
    <li className="px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${confermato ? "bg-green-500" : "bg-amber-400"}`} title={confermato ? "Confermato" : "Da confermare"} />
          <button onClick={() => azioni.apriScheda(c.id)} className="flex-1 min-w-0 text-left">
            <p className="font-bold text-slate-800 hover:underline truncate">{nomeCompleto(c)}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-500">
                {c.istituto}
                {c.classe ? ` · ${c.classe}` : ""}
              </span>
              <TipoBadge tipo={c.tipo_adesione} />
              <EcgBadge v={c.ha_fatto_ecg} />
            </div>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-5 sm:pl-0 shrink-0">
          {confermato ? (
            <>
              <span className="text-[11px] font-black text-green-700">✓ Confermato</span>
              <Bottone onClick={() => cambiaStato("Contattato")} disabled={inCorso} title="Torna da confermare">
                ↩ Annulla
              </Bottone>
            </>
          ) : (
            <Bottone tipo="blu" onClick={() => cambiaStato("Confermato")} disabled={inCorso} title="Il ragazzo ha confermato che ci sarà">
              ✅ Segna confermato
            </Bottone>
          )}
          <Bottone tipo="pericolo" onClick={() => setTogli(!togli)} disabled={inCorso}>
            ✕ Togli
          </Bottone>
          <LinkWhatsApp href={linkWhatsApp(c.cellulare, testo)} />
        </div>
      </div>
      {togli && (
        <div className="mt-3 sm:ml-5">
          <FormTogli c={c} azioni={azioni} onChiudi={() => setTogli(false)} />
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------
// Scheda di un turno con i 4 passi
// ---------------------------------------------------------------
function CardTurno({
  t,
  profs,
  azioni,
  spunta,
  setSpunta,
}: {
  t: Turno;
  profs: Professore[];
  azioni: Azioni;
  spunta: SpuntaTurno;
  setSpunta: (s: SpuntaTurno) => void;
}) {
  const [foglio, setFoglio] = useState(false);
  const posti = CONFIG_TURNI.postiPerTurno;
  const tuttoConfermato = t.daConfermare.length === 0;
  const giorni = giorniDaOggi(t.data);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3 bg-slate-50 border-b border-slate-200">
        <div className="min-w-0">
          <h3 className="font-black text-slate-800 text-base md:text-lg">📅 {iniziale(fmtData(t.data, "lunga"))}</h3>
          <p className="text-xs text-slate-500">
            {CONFIG_TURNI.luogo} · <b>{quando(t.data)}</b>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-black px-2 py-1 rounded-full border ${t.persone.length > posti ? "bg-red-100 text-red-700 border-red-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {t.persone.length}/{posti} posti
          </span>
          {tuttoConfermato ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-green-100 text-green-700">Tutti confermati</span>
          ) : (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              {t.confermati.length}/{t.persone.length} confermati
            </span>
          )}
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {t.persone.map((c) => (
          <RigaTurno key={c.id} c={c} azioni={azioni} />
        ))}
      </ul>

      <div className="p-4 space-y-4 border-t border-slate-200 bg-slate-50/60">
        <Passo n={1} titolo="Chiedi ai ragazzi se ci sono" fatto={tuttoConfermato}>
          {tuttoConfermato ? (
            <p className="text-xs text-slate-500">Hanno confermato tutti ✓</p>
          ) : (
            <p className="text-xs text-slate-600">
              Scrivi a ciascuno con 💬 WhatsApp (il messaggio chiede già di confermare). Poi, qui sopra: <b>✅ Segna confermato</b> se ci sarà, <b>✕ Togli</b> se non
              può (scrivi il motivo e da quando ricontattarlo). Mancano <b>{t.daConfermare.length}</b>.
            </p>
          )}
        </Passo>

        <Passo n={2} titolo="Manda i nominativi al trasfusionale" fatto={!!spunta.lista} spento={t.confermati.length === 0}>
          {t.confermati.length === 0 ? (
            <p className="text-xs text-slate-500">Si attiva quando almeno un ragazzo ha confermato.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Bottone onClick={() => setFoglio(true)}>📋 Lista da fotografare ({t.confermati.length})</Bottone>
                <Bottone onClick={() => copia(msgListaTrasfusionale(t, false), "Elenco")}>Copia testo</Bottone>
                <CasellaFatto checked={!!spunta.lista} onChange={(v) => setSpunta({ ...spunta, lista: v })} testo="Inviata" />
              </div>
              <p className="text-[11px] text-slate-500">Nella lista ci sono solo i ragazzi che hanno confermato. Se ne conferma un altro dopo, rimanda la lista aggiornata.</p>
            </>
          )}
        </Passo>

        <Passo n={3} titolo="Manda i nominativi ai professori" fatto={!!spunta.prof} spento={t.confermati.length === 0}>
          {t.confermati.length === 0 ? (
            <p className="text-xs text-slate-500">Si attiva quando almeno un ragazzo ha confermato.</p>
          ) : (
            <>
              <AvvisoProf t={t} profs={profs} azioni={azioni} />
              <CasellaFatto checked={!!spunta.prof} onChange={(v) => setSpunta({ ...spunta, prof: v })} testo="Prof avvisati" />
            </>
          )}
        </Passo>

        <Passo n={4} titolo="Promemoria ai ragazzi (il giorno prima)" fatto={false} spento={t.confermati.length === 0 || giorni > 3}>
          <div className="flex flex-wrap gap-2">
            {t.confermati.map((c) => (
              <LinkWhatsApp key={c.id} href={linkWhatsApp(c.cellulare, msgPromemoria(c, c.data_disponibilita))}>
                {maiuscolaIniziale(c.nome) || "Promemoria"}
              </LinkWhatsApp>
            ))}
            {t.confermati.length === 0 && <p className="text-xs text-slate-500">Quando i ragazzi confermano, qui trovi i messaggi di promemoria già pronti.</p>}
          </div>
        </Passo>
      </div>

      {foglio && <FoglioTrasfusionale t={t} onClose={() => setFoglio(false)} onInviata={() => setSpunta({ ...spunta, lista: true })} />}
    </div>
  );
}

export default function VistaTurni({
  turni,
  profs,
  azioni,
  ricerca,
  spunte,
  setSpunta,
}: {
  turni: Turno[];
  profs: Professore[];
  azioni: Azioni;
  ricerca: string;
  spunte: Record<string, SpuntaTurno>;
  setSpunta: (data: string, s: SpuntaTurno) => void;
}) {
  const filtrati = ricerca ? turni.filter((t) => t.persone.some((c) => contiene(c, ricerca))) : turni;
  const senzaData = filtrati.filter((t) => t.data === "senza-data");
  const prossimi = filtrati.filter((t) => t.data !== "senza-data" && !t.passato);
  const passati = filtrati.filter((t) => t.passato).reverse();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Istruzioni id="turni">
        <p>I turni sono le date già concordate con il trasfusionale. Ogni turno ha 4 passi, da fare in ordine:</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>
            <b>Conferma tu i ragazzi</b>: chiedi a ognuno se è disponibile (💬 WhatsApp accanto al nome). Quando ti dice di sì tocca <b>✅ Segna confermato</b>, se non può
            tocca <b>✕ Togli</b> (con il motivo, es. &quot;meno di 50 kg&quot;, e da quando ricontattarlo: tornerà tra i &quot;Da ricontattare&quot;). La conferma la dai tu,
            non il trasfusionale.
          </li>
          <li>
            <b>Foto al trasfusionale</b>: apri la lista (solo chi hai confermato), fai lo screenshot e mandalo. Poi spunta &quot;Inviata&quot;.
          </li>
          <li>
            <b>Stessa foto ai prof</b> delle scuole coinvolte: al passo 3 trovi i loro contatti (WhatsApp o email). Poi spunta &quot;Prof avvisati&quot;.
          </li>
          <li>
            Il giorno prima manda il <b>promemoria</b> ai ragazzi che il giorno dopo fanno la donazione.
          </li>
        </ol>
        <p className="text-xs">
          Il pallino <span className="text-amber-500">●</span> giallo = non ancora confermato, <span className="text-green-600">●</span> verde = confermato da te. Tocca un nome per aprire la scheda (lì puoi anche spostarlo in un&apos;altra data).
          Le spunte &quot;Inviata&quot; e &quot;Prof avvisati&quot; restano salvate su questo dispositivo.
        </p>
      </Istruzioni>

      {senzaData.map((t) => (
        <div key="senza-data" className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-900">
          <p className="font-bold mb-2">⚠️ Persone in turno senza data</p>
          <p className="text-xs mb-2">Apri la scheda e usa &quot;Sposta in un&apos;altra data&quot;.</p>
          <div className="flex flex-wrap gap-2">
            {t.persone.map((c) => (
              <Bottone key={c.id} onClick={() => azioni.apriScheda(c.id)}>
                {nomeCompleto(c)}
              </Bottone>
            ))}
          </div>
        </div>
      ))}

      {prossimi.length === 0 ? (
        <Vuoto icona="📅" titolo={ricerca ? "Nessun turno con questo nome." : "Nessun turno in programma."}>
          <p>
            Vai su{" "}
            <button onClick={() => azioni.vaiA("contattare")} className="font-bold underline">
              Da contattare
            </button>{" "}
            e metti qualcuno in un turno.
          </p>
        </Vuoto>
      ) : (
        prossimi.map((t) => <CardTurno key={t.data} t={t} profs={profs} azioni={azioni} spunta={spunte[t.data] || {}} setSpunta={(s) => setSpunta(t.data, s)} />)
      )}

      {passati.length > 0 && (
        <details className="bg-white border border-slate-200 rounded-2xl">
          <summary className="cursor-pointer px-4 py-3 font-bold text-slate-600 text-sm">🗂 Turni passati ({passati.length})</summary>
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {passati.map((t) => (
              <li key={t.data} className="px-4 py-3">
                <p className="text-sm font-bold text-slate-700">
                  {iniziale(fmtData(t.data, "lunga"))}{" "}
                  <span className="text-xs font-semibold text-slate-400 normal-case">
                    · {t.persone.length} {t.persone.length === 1 ? "persona" : "persone"}
                    {t.daConfermare.length > 0 && <span className="text-amber-600"> · {t.daConfermare.length} mai confermati</span>}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {t.persone.map((c) => (
                    <button key={c.id} onClick={() => azioni.apriScheda(c.id)} className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                      {nomeCompleto(c)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
