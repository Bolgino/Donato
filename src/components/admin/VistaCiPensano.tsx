"use client";
// "Voglio pensarci": si ricontattano circa un mese dopo, SOLO VIA MAIL ("Lettera indecisi").
import { Candidato } from "@/types/admin";
import {
  addGiorni,
  addMesi,
  blocchiOggi,
  contiene,
  emailValida,
  fmtData,
  GIORNI_PER_RISPONDERE,
  linkGmail,
  linkGmailCcn,
  MESI_PRIMA_DI_RISCRIVERE_A_CHI_CI_PENSA,
  nato,
  nomeCompleto,
  oggiISO,
  quando,
  soloData,
} from "@/lib/donato";
import { msgIndecisi, OGGETTO_INDECISI } from "@/lib/messaggi";
import { Azioni } from "./tipi";
import { BlocchiBadge, Bottone, Istruzioni, LinkGmail, Vuoto } from "./ui";

/** Giorno da cui va mandata la mail (circa un mese dopo la risposta al modulo) */
export function quandoScrivere(c: Candidato): string {
  return addMesi(soloData(c.created_at), MESI_PRIMA_DI_RISCRIVERE_A_CHI_CI_PENSA);
}

/** È passato circa un mese e la mail non è ancora stata mandata (= nessuna scadenza salvata) */
export function daRiscrivere(c: Candidato): boolean {
  return !c.scadenza_risposta && quandoScrivere(c) <= oggiISO();
}

export function scadenzaPassata(c: Candidato): boolean {
  return !!c.scadenza_risposta && soloData(c.scadenza_risposta) < oggiISO();
}

function priorita(c: Candidato) {
  if (scadenzaPassata(c)) return 0;
  if (daRiscrivere(c)) return 1;
  return 2;
}

export default function VistaCiPensano({ lista, azioni, ricerca }: { lista: Candidato[]; azioni: Azioni; ricerca: string }) {
  const mostrati = lista.filter((c) => contiene(c, ricerca)).sort((a, b) => priorita(a) - priorita(b) || a.created_at.localeCompare(b.created_at));
  const quanti = lista.filter((c) => daRiscrivere(c) || scadenzaPassata(c)).length;
  const entroProposto = addGiorni(oggiISO(), GIORNI_PER_RISPONDERE);

  // Mail unica, in copia nascosta, a tutti quelli a cui è ora di scrivere
  const daScrivere = lista.filter((c) => daRiscrivere(c) && emailValida(c.email));
  const mailATutti = () =>
    azioni.aggiornaMolti(
      daScrivere.map((c) => c.id),
      { scadenza_risposta: entroProposto },
      `Mail aperta per ${daScrivere.length} persone · risposta entro il ${fmtData(entroProposto)}`,
    );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Istruzioni id="pensano">
        <p>Qui ci sono le persone che nel modulo hanno risposto &quot;Voglio pensarci&quot;. Si ricontattano <b>circa un mese dopo e solo via mail</b>.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>
            Quando è il momento la persona diventa <span className="text-red-600 font-bold">rossa</span> e sale in cima. Tocca <b>✉️ Manda la mail</b>: si apre Gmail con la
            lettera già scritta e la data entro cui rispondere (tra {GIORNI_PER_RISPONDERE} giorni), che viene salvata.
          </li>
          <li>Se sono più di una, puoi mandare un&apos;unica mail a tutti in copia nascosta (Ccn).</li>
          <li>
            Quando rispondono apri <b>Gestisci</b>: se sì → <b>✅ Vuole partecipare</b> (passa in &quot;Da contattare&quot;), se no → <b>❌ Non interessato</b> (va in archivio).
          </li>
        </ol>
      </Istruzioni>

      {quanti > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg text-sm text-yellow-900 flex flex-wrap items-center gap-3">
          <span className="flex-1 min-w-[200px]">
            <b>⏳ {quanti} {quanti === 1 ? "persona aspetta" : "persone aspettano"} una tua mail</b> (passato circa un mese, o scadenza superata). Sono in cima alla lista.
          </span>
          {daScrivere.length > 1 && (
            <a
              href={linkGmailCcn(
                daScrivere.map((c) => c.email),
                OGGETTO_INDECISI,
                msgIndecisi(entroProposto),
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={mailATutti}
              className="inline-flex items-center gap-1.5 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 px-3 py-2 text-xs"
            >
              ✉️ Una mail a tutti ({daScrivere.length}) in Ccn
            </a>
          )}
        </div>
      )}

      {mostrati.length === 0 ? (
        <Vuoto titolo={ricerca ? "Nessun risultato per la ricerca." : "Nessuno ci sta pensando."} />
      ) : (
        <ul className="space-y-2">
          {mostrati.map((c) => {
            const vecchio = daRiscrivere(c);
            const scaduta = scadenzaPassata(c);
            const minorenne = blocchiOggi(c).find((b) => b.codice === "MINORENNE");
            const entro = c.scadenza_risposta ? soloData(c.scadenza_risposta) : entroProposto;
            const mail = emailValida(c.email) ? linkGmail(c.email, OGGETTO_INDECISI, msgIndecisi(entro)) : null;
            const salvaScadenza = () => {
              if (!c.scadenza_risposta) azioni.aggiorna(c.id, { scadenza_risposta: entroProposto }, `Mail aperta · risposta entro il ${fmtData(entroProposto)}`);
            };
            return (
              <li key={c.id} className={`bg-white rounded-2xl border shadow-sm p-3 md:p-4 flex flex-col sm:flex-row gap-3 ${vecchio || scaduta ? "border-red-200" : "border-slate-200"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button onClick={() => azioni.apriScheda(c.id)} className="font-extrabold text-base text-slate-800 hover:underline text-left">
                      {nomeCompleto(c)}
                    </button>
                    <BlocchiBadge c={c} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.istituto}
                    {c.classe ? ` · ${c.classe}` : ""}
                    {c.data_nascita ? ` · ${nato(c.sesso)} il ${fmtData(c.data_nascita)}` : ""} ·{" "}
                    <span className={vecchio ? "text-red-600 font-bold" : ""}>
                      {vecchio && "⚠️ "}risposta del {fmtData(c.created_at)} ({quando(c.created_at)})
                    </span>
                  </p>
                  {minorenne && <p className="text-[11px] font-bold text-red-600 mt-1">🔞 {minorenne.testo}</p>}
                  {c.scadenza_risposta ? (
                    <p className={`text-[11px] font-bold mt-1 ${scaduta ? "text-red-600" : "text-slate-600"}`}>
                      {scaduta ? "⛔ Mail mandata, scadenza passata: " : "✉️ Mail mandata · risposta entro "} {fmtData(c.scadenza_risposta)}
                    </p>
                  ) : (
                    !vecchio && <p className="text-[11px] text-slate-500 mt-1">📅 Da scrivere dal {fmtData(quandoScrivere(c))}</p>
                  )}
                  {c.motivo_scelta && (
                    <p className="text-[11px] text-slate-600 mt-1">
                      <b>Perché:</b> {c.motivo_scelta}
                    </p>
                  )}
                  {c.note && <p className="text-[11px] text-slate-500 italic mt-1">“{c.note}”</p>}
                  {!mail && <p className="text-[11px] font-bold text-orange-700 mt-1">Manca un indirizzo email valido.</p>}
                </div>
                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                  <LinkGmail href={mail} onClick={salvaScadenza}>
                    {c.scadenza_risposta ? "Riscrivi la mail" : "Manda la mail"}
                  </LinkGmail>
                  <Bottone tipo="primario" onClick={() => azioni.apriScheda(c.id)}>
                    Gestisci
                  </Bottone>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
