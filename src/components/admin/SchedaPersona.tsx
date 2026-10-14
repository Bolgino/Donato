"use client";
// Scheda di una persona: tutti i dati + i pulsanti per spostarla nella fase successiva.
import { ReactNode, useState } from "react";
import toast from "react-hot-toast";
import { Candidato } from "@/types/admin";
import {
  addGiorni,
  blocchiAl,
  calcolaAnnoScolastico,
  CONFIG_TURNI,
  dateLibere,
  dateProposte,
  emailValida,
  ETICHETTA_FASE,
  etaAl,
  Fase,
  faseDi,
  fmtData,
  giorniDaOggi,
  iniziale,
  isGiaDonatore,
  linkGmail,
  linkWhatsApp,
  nomeCompleto,
  occupazioneTurni,
  oggiISO,
  primaDataUtile,
  soloData,
  statoDonatore,
} from "@/lib/donato";
import { ETICHETTA_MESSAGGIO, NOME_PROGETTO, testoMessaggio, TipoMessaggio } from "@/lib/messaggi";
import { Azioni } from "./tipi";
import { BlocchiBadge, Bottone, conferma, EcgBadge, LinkGmail, LinkWhatsApp, Modale, TipoBadge } from "./ui";

function messaggioPredefinito(fase: Fase, c: Candidato): TipoMessaggio {
  if (fase === "da_contattare" || fase === "da_ricontattare") return "primo";
  if (fase === "in_turno") return "inserito";
  if (fase === "confermato") return c.data_disponibilita && giorniDaOggi(c.data_disponibilita) <= 2 ? "promemoria" : "confermato";
  if (fase === "ci_pensa") return "pensaci";
  return "vuoto";
}

function Sezione({ titolo, children, colore = "slate" }: { titolo: string; children: ReactNode; colore?: "slate" | "red" | "green" | "blue" }) {
  const bordo = { slate: "border-slate-200", red: "border-red-200", green: "border-green-200", blue: "border-blue-200" }[colore];
  return (
    <section className={`border ${bordo} rounded-2xl p-4 space-y-3`}>
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">{titolo}</h4>
      {children}
    </section>
  );
}

/** Griglia per scegliere la data del turno */
export function SceltaData({
  c,
  tutti,
  valore,
  onChange,
}: {
  c: Candidato;
  tutti: Candidato[];
  valore: string;
  onChange: (d: string) => void;
}) {
  const occ = occupazioneTurni(tutti);
  const attuale = c.data_disponibilita ? soloData(c.data_disponibilita) : null;
  const inizioStandard = addGiorni(oggiISO(), CONFIG_TURNI.giorniPreavviso);
  const dal = primaDataUtile(c);
  const motiviAttesa = dal > inizioStandard ? blocchiAl(c, inizioStandard).filter((b) => b.dal) : [];
  const slots = dateProposte(occ, [attuale, valore || null], dal);
  const [altra, setAltra] = useState(false);
  const bloccoValore = valore ? blocchiAl(c, valore) : [];

  return (
    <div className="space-y-2">
      {motiviAttesa.length > 0 && (
        <p className="text-xs bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-2">
          ⏳ Prime date possibili dal <b>{fmtData(dal)}</b>: {motiviAttesa.map((b) => b.testo.toLowerCase()).join(" · ")}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((s) => {
          const b = blocchiAl(c, s.data);
          const occupatiAltri = s.occupati - (attuale === s.data ? 1 : 0);
          const pieno = occupatiAltri >= CONFIG_TURNI.postiPerTurno;
          const scelto = valore === s.data;
          return (
            <button
              key={s.data}
              type="button"
              disabled={b.length > 0}
              onClick={() => onChange(s.data)}
              className={`text-left p-2.5 rounded-xl border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                scelto ? "border-red-600 bg-red-50" : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="font-bold text-sm text-slate-800">{iniziale(fmtData(s.data, "giornoAnno"))}</div>
              <div className={`text-[10px] font-semibold ${b.length ? "text-red-600" : pieno ? "text-orange-600" : "text-slate-500"}`}>
                {b.length ? b[0].testo : attuale === s.data ? `turno attuale · ${s.occupati}/${CONFIG_TURNI.postiPerTurno}` : `${s.occupati}/${CONFIG_TURNI.postiPerTurno} occupati${pieno ? " · PIENO" : ""}`}
              </div>
            </button>
          );
        })}
      </div>
      {!altra ? (
        <button type="button" onClick={() => setAltra(true)} className="text-xs font-bold text-slate-500 underline">
          Altra data concordata con il trasfusionale…
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="date"
            min={oggiISO()}
            value={valore}
            onChange={(e) => onChange(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
          />
          <span className="text-[11px] text-slate-500">
            {valore ? `${occ[valore] || 0}/${CONFIG_TURNI.postiPerTurno} occupati` : "scegli il giorno"}
          </span>
        </div>
      )}
      {bloccoValore.length > 0 && <p className="text-xs font-bold text-red-600">⚠️ {bloccoValore.map((b) => b.testo).join(" · ")}</p>}
    </div>
  );
}

export default function SchedaPersona({
  c,
  tutti,
  azioni,
  onClose,
}: {
  c: Candidato;
  tutti: Candidato[];
  azioni: Azioni;
  onClose: () => void;
}) {
  const fase = faseDi(c);
  const [scelta, setScelta] = useState<{ fase: Fase; tipo: TipoMessaggio } | null>(null);
  const tipoMsg = scelta && scelta.fase === fase ? scelta.tipo : messaggioPredefinito(fase, c);
  const occ = occupazioneTurni(tutti);
  const testo = testoMessaggio(tipoMsg, c, dateLibere(c, occ));

  const [dataTurno, setDataTurno] = useState("");
  const [subitoConfermato, setSubitoConfermato] = useState(false);
  const [ricData, setRicData] = useState(c.data_ricontatto ? soloData(c.data_ricontatto) : "");
  const [ricNota, setRicNota] = useState(c.note_ricontatto || "");
  const [mostraRicontatto, setMostraRicontatto] = useState(false);
  const [scadenza, setScadenza] = useState(c.scadenza_risposta ? soloData(c.scadenza_risposta) : addGiorni(oggiISO(), 14));
  const [nuovaData, setNuovaData] = useState("");
  const [inCorso, setInCorso] = useState(false);

  const sd = statoDonatore(c);
  const dataAttuale = c.data_disponibilita ? soloData(c.data_disponibilita) : null;

  const esegui = async (fn: () => Promise<boolean>) => {
    setInCorso(true);
    const ok = await fn();
    setInCorso(false);
    return ok;
  };

  const controllaData = async (d: string): Promise<boolean> => {
    if (!d) {
      toast.error("Scegli prima la data del turno.");
      return false;
    }
    const b = blocchiAl(c, d);
    if (b.length) {
      toast.error(b.map((x) => x.testo).join(" · "));
      return false;
    }
    const occupati = (occ[d] || 0) - (dataAttuale === d ? 1 : 0);
    if (occupati >= CONFIG_TURNI.postiPerTurno) {
      return conferma(`Il turno del ${fmtData(d)} è già pieno (${occupati}/${CONFIG_TURNI.postiPerTurno}). Aggiungere comunque?`, "Aggiungi", false);
    }
    return true;
  };

  const mettiInTurno = async () => {
    if (!(await controllaData(dataTurno))) return;
    const payload: Partial<Candidato> = {
      shift_status: subitoConfermato ? "Confermato" : "Contattato",
      data_disponibilita: dataTurno,
      data_ricontatto: null,
    };
    // Regola di prima: un "già donatore" fermo da più di 2 anni torna aspirante
    if (isGiaDonatore(c.tipo_adesione) && sd.scaduto) payload.tipo_adesione = "Aspirante";
    const ok = await esegui(() => azioni.aggiorna(c.id, payload, `Inserito nel turno di ${fmtData(dataTurno, "giorno")}`));
    if (ok) setDataTurno("");
  };

  const salvaRicontatto = () =>
    esegui(() =>
      azioni.aggiorna(
        c.id,
        { shift_status: "Da Ricontattare", data_ricontatto: ricData || null, note_ricontatto: ricNota, data_disponibilita: null },
        "Segnato da ricontattare",
      ),
    ).then((ok) => ok && setMostraRicontatto(false));

  const segnaNo = async () => {
    if (!(await conferma(`${nomeCompleto(c)} non partecipa più? Verrà spostato nell'archivio come "No".`, "Sì, non partecipa"))) return;
    await esegui(() => azioni.aggiorna(c.id, { tipo_adesione: "No", shift_status: "Da Valutare", scadenza_risposta: null }, "Segnato come NO"));
  };

  const sposta = async () => {
    if (nuovaData === dataAttuale) return toast.error("È già in questo turno.");
    if (!(await controllaData(nuovaData))) return;
    const ok = await esegui(() => azioni.aggiorna(c.id, { data_disponibilita: nuovaData }, `Spostato al ${fmtData(nuovaData, "giorno")}`));
    if (ok) setNuovaData("");
  };

  const togliDalTurno = async () => {
    if (!(await conferma("Togliere questa persona dal turno? Finirà tra i 'Da ricontattare'.", "Sì, togli"))) return;
    await esegui(() =>
      azioni.aggiorna(c.id, { shift_status: "Da Ricontattare", data_disponibilita: null, note_ricontatto: "Rimosso dal turno." }, "Tolto dal turno"),
    );
  };

  const elimina = async () => {
    if (!(await conferma(`Eliminare DEFINITIVAMENTE ${nomeCompleto(c)}? Non si può annullare.`, "Elimina ora"))) return;
    const ok = await esegui(() => azioni.elimina(c.id));
    if (ok) onClose();
  };

  const eta = etaAl(c.data_nascita, oggiISO());
  const wa = tipoMsg === "vuoto" ? linkWhatsApp(c.cellulare) : linkWhatsApp(c.cellulare, testo);
  const mail = emailValida(c.email) ? linkGmail(c.email, NOME_PROGETTO, testo || undefined) : null;

  return (
    <Modale onClose={onClose}>
      {/* Intestazione */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-black text-slate-800 leading-tight break-words">{nomeCompleto(c)}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <TipoBadge tipo={c.tipo_adesione} />
            <BlocchiBadge c={c} />
            <EcgBadge v={c.ha_fatto_ecg} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white whitespace-nowrap">{ETICHETTA_FASE[fase]}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-800 text-2xl leading-none px-1" aria-label="Chiudi">
          ✕
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* CONTATTA */}
        <Sezione titolo="1 · Scrivigli">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={tipoMsg}
              onChange={(e) => setScelta({ fase, tipo: e.target.value as TipoMessaggio })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 font-semibold flex-1"
            >
              {(Object.keys(ETICHETTA_MESSAGGIO) as TipoMessaggio[]).map((k) => (
                <option key={k} value={k}>
                  {ETICHETTA_MESSAGGIO[k]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <LinkWhatsApp href={wa} grande />
              <LinkGmail href={mail} grande />
            </div>
          </div>
          {testo && (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-500">Vedi il testo che verrà scritto</summary>
              <p className="whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg p-3 mt-2">{testo}</p>
            </details>
          )}
          <p className="text-[11px] text-slate-500">
            📱 {c.cellulare || "—"} {emailValida(c.email) && <>· ✉️ {c.email}</>}
          </p>
        </Sezione>

        {/* AZIONI IN BASE ALLA FASE */}
        {(fase === "da_contattare" || fase === "da_ricontattare") && (
          <Sezione titolo="2 · Quando ti ha risposto" colore="red">
            {fase === "da_ricontattare" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-900">
                <b>Da ricontattare</b>
                {c.data_ricontatto && <> dal {fmtData(c.data_ricontatto)}</>}
                {c.note_ricontatto && <> · motivo: {c.note_ricontatto}</>}
              </div>
            )}
            {isGiaDonatore(c.tipo_adesione) && c.data_ultima_donazione && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                🩸 Ultima donazione/visita: <b>{fmtData(c.data_ultima_donazione)}</b>
                {sd.recente && <> · può tornare dal <b>{fmtData(sd.sblocco)}</b> (3 mesi)</>}
                {sd.scaduto && <> · più di 2 anni fa: quando lo metti in turno torna <b>aspirante</b></>}
              </div>
            )}
            <p className="text-sm font-bold text-slate-700">✅ Ha detto sì: scegli il turno</p>
            <SceltaData c={c} tutti={tutti} valore={dataTurno} onChange={setDataTurno} />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={subitoConfermato} onChange={(e) => setSubitoConfermato(e.target.checked)} className="w-4 h-4 accent-red-600" />
              Il trasfusionale ha già confermato questa data (segna subito come confermato)
            </label>
            <Bottone tipo="primario" grande onClick={mettiInTurno} disabled={!dataTurno || inCorso}>
              📅 Metti nel turno {dataTurno ? `di ${fmtData(dataTurno, "giorno")}` : ""}
            </Bottone>

            <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2">
              <Bottone onClick={() => setMostraRicontatto(!mostraRicontatto)}>🔄 Non risponde / più avanti</Bottone>
              {fase === "da_ricontattare" && (
                <Bottone
                  onClick={() => esegui(() => azioni.aggiorna(c.id, { shift_status: "Da Valutare", data_ricontatto: null }, "Riportato tra i nuovi"))}
                  disabled={inCorso}
                >
                  ↩ Riporta tra i nuovi
                </Bottone>
              )}
              <Bottone tipo="pericolo" onClick={segnaNo} disabled={inCorso}>
                ❌ Non partecipa più
              </Bottone>
            </div>
            {mostraRicontatto && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-bold text-slate-600">Ricontattare dal (facoltativo)</label>
                <input type="date" value={ricData} onChange={(e) => setRicData(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
                <label className="block text-xs font-bold text-slate-600">Motivo</label>
                <textarea
                  value={ricNota}
                  onChange={(e) => setRicNota(e.target.value)}
                  placeholder="es. non risponde, influenza, compie 18 anni a dicembre…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none bg-white"
                />
                <Bottone tipo="blu" onClick={salvaRicontatto} disabled={inCorso}>
                  Salva
                </Bottone>
              </div>
            )}
          </Sezione>
        )}

        {(fase === "in_turno" || fase === "confermato") && (
          <Sezione titolo="2 · Turno" colore={fase === "confermato" ? "green" : "blue"}>
            <p className="text-sm text-slate-700">
              <b>{dataAttuale ? iniziale(fmtData(dataAttuale, "lunga")) : "Data non impostata"}</b>
              {" · "}
              {fase === "confermato" ? <span className="text-green-700 font-bold">confermato dal trasfusionale</span> : <span className="text-blue-700 font-bold">in attesa di conferma dal trasfusionale</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {fase === "in_turno" ? (
                <Bottone tipo="ok" onClick={() => esegui(() => azioni.aggiorna(c.id, { shift_status: "Confermato" }, "Turno confermato"))} disabled={inCorso || !dataAttuale}>
                  ✅ Segna confermato
                </Bottone>
              ) : (
                <Bottone onClick={() => esegui(() => azioni.aggiorna(c.id, { shift_status: "Contattato" }, "Tornato 'da confermare'"))} disabled={inCorso}>
                  ↩ Torna "da confermare"
                </Bottone>
              )}
              <Bottone tipo="pericolo" onClick={togliDalTurno} disabled={inCorso}>
                Togli dal turno
              </Bottone>
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-bold text-slate-500">Sposta in un&apos;altra data…</summary>
              <div className="mt-3 space-y-2">
                <SceltaData c={c} tutti={tutti} valore={nuovaData} onChange={setNuovaData} />
                <Bottone tipo="blu" onClick={sposta} disabled={!nuovaData || inCorso}>
                  Sposta {nuovaData ? `al ${fmtData(nuovaData, "giorno")}` : ""}
                </Bottone>
              </div>
            </details>
          </Sezione>
        )}

        {fase === "ci_pensa" && (
          <Sezione titolo="2 · Ci sta pensando" colore="slate">
            {c.motivo_scelta && (
              <p className="text-xs text-slate-600">
                <b>Perché ci pensa:</b> {c.motivo_scelta}
              </p>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Deve rispondere entro</label>
                <input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
              </div>
              <Bottone onClick={() => esegui(() => azioni.aggiorna(c.id, { scadenza_risposta: scadenza || null }, "Scadenza salvata"))} disabled={!scadenza || inCorso}>
                ⏳ Salva scadenza
              </Bottone>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Bottone
                tipo="ok"
                onClick={() =>
                  esegui(() =>
                    azioni.aggiorna(c.id, { tipo_adesione: "Aspirante", shift_status: "In Attesa", scadenza_risposta: null }, "Ora è tra i 'Da contattare'"),
                  )
                }
                disabled={inCorso}
              >
                ✅ Vuole partecipare
              </Bottone>
              <Bottone tipo="pericolo" onClick={segnaNo} disabled={inCorso}>
                ❌ Non interessato
              </Bottone>
            </div>
          </Sezione>
        )}

        {(fase === "no" || fase === "altro") && (
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">Questa risposta è solo in archivio: non c&apos;è niente da fare.</p>
        )}

        {/* DATI */}
        <Sezione titolo="Dati dal modulo">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Dato k="Iscritto il" v={`${fmtData(c.created_at)} (a.s. ${calcolaAnnoScolastico(c.created_at)})`} />
            <Dato k="Data di nascita" v={c.data_nascita ? `${fmtData(c.data_nascita)}${eta !== null ? ` (${eta} anni)` : ""}` : "—"} />
            <Dato k="Sesso" v={c.sesso || "—"} />
            <Dato k="Scuola" v={`${c.istituto || "—"}${c.classe ? ` · ${c.classe}` : ""}`} />
            <Dato k="Cellulare" v={c.cellulare || "—"} />
            <Dato k="Email" v={c.email || "—"} />
            {c.data_ultima_donazione && <Dato k="Ultima donazione" v={fmtData(c.data_ultima_donazione)} />}
            {c.scadenza_risposta && <Dato k="Risposta entro" v={fmtData(c.scadenza_risposta)} />}
            <Dato k="Privacy" v={c.consenso_privacy ? "✅ sì" : "❌ no"} />
            <Dato k="Foto/video" v={c.consenso_multimediale ? "✅ sì" : "❌ no"} />
            <Dato k="In Google Contatti" v={c.esportato_csv ? "✅ esportato" : "non ancora"} />
          </dl>
          {c.note && <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 italic">“{c.note}”</p>}
          {c.motivo_scelta && fase !== "ci_pensa" && (
            <p className="text-xs text-slate-600">
              <b>Motivazione:</b> {c.motivo_scelta}
            </p>
          )}
          {c.note_ricontatto && fase !== "da_ricontattare" && (
            <p className="text-xs text-slate-600">
              <b>Note:</b> {c.note_ricontatto}
            </p>
          )}
        </Sezione>

        <div className="flex justify-end pt-2">
          <button onClick={elimina} disabled={inCorso} className="text-xs font-bold text-red-500 hover:text-red-700 underline">
            Elimina definitivamente questa risposta
          </button>
        </div>
      </div>
    </Modale>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</dt>
      <dd className="text-slate-800 font-medium break-words">{v}</dd>
    </div>
  );
}
