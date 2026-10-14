"use client";
import { Candidato } from "@/types/admin";
import {
  addMesi,
  contiene,
  emailValida,
  fmtData,
  linkGmail,
  linkWhatsApp,
  MESI_PRIMA_DI_RISCRIVERE_A_CHI_CI_PENSA,
  nomeCompleto,
  oggiISO,
  quando,
  soloData,
} from "@/lib/donato";
import { msgPensaci, NOME_PROGETTO } from "@/lib/messaggi";
import { Azioni } from "./tipi";
import { Bottone, Istruzioni, LinkGmail, LinkWhatsApp, Vuoto } from "./ui";

/** Da più di un mese ci pensa e non ha ancora una scadenza per rispondere */
export function daRiscrivere(c: Candidato): boolean {
  return !c.scadenza_risposta && soloData(c.created_at) < addMesi(oggiISO(), -MESI_PRIMA_DI_RISCRIVERE_A_CHI_CI_PENSA);
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

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Istruzioni id="pensano">
        <p>Qui ci sono le persone che nel modulo hanno risposto &quot;Voglio pensarci&quot;.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Dopo circa un mese scrivigli (💬 WhatsApp o ✉️ Email: il testo è pronto).</li>
          <li>
            Apri <b>Gestisci</b> e imposta <b>entro quando</b> deve rispondere.
          </li>
          <li>
            Se dice sì → <b>✅ Vuole partecipare</b>: passa in &quot;Da contattare&quot;. Se dice no → <b>❌ Non interessato</b>: va in archivio.
          </li>
        </ol>
      </Istruzioni>

      {quanti > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg text-sm text-yellow-900">
          <b>⏳ {quanti} {quanti === 1 ? "persona aspetta" : "persone aspettano"} una tua risposta</b> (in attesa da più di un mese o con la scadenza passata). Sono in cima alla lista.
        </div>
      )}

      {mostrati.length === 0 ? (
        <Vuoto titolo={ricerca ? "Nessun risultato per la ricerca." : "Nessuno ci sta pensando."} />
      ) : (
        <ul className="space-y-2">
          {mostrati.map((c) => {
            const vecchio = daRiscrivere(c);
            const scaduta = scadenzaPassata(c);
            const testo = msgPensaci(c);
            return (
              <li key={c.id} className={`bg-white rounded-2xl border shadow-sm p-3 md:p-4 flex flex-col sm:flex-row gap-3 ${vecchio || scaduta ? "border-red-200" : "border-slate-200"}`}>
                <div className="flex-1 min-w-0">
                  <button onClick={() => azioni.apriScheda(c.id)} className="font-extrabold text-base text-slate-800 hover:underline text-left">
                    {nomeCompleto(c)}
                  </button>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.istituto}
                    {c.classe ? ` · ${c.classe}` : ""} ·{" "}
                    <span className={vecchio ? "text-red-600 font-bold" : ""}>
                      {vecchio && "⚠️ "}risposta del {fmtData(c.created_at)} ({quando(c.created_at)})
                    </span>
                  </p>
                  {c.scadenza_risposta && (
                    <p className={`text-[11px] font-bold mt-1 ${scaduta ? "text-red-600" : "text-slate-600"}`}>
                      {scaduta ? "⛔ Scadenza passata: " : "⏳ Risposta entro "} {fmtData(c.scadenza_risposta)}
                    </p>
                  )}
                  {c.motivo_scelta && (
                    <p className="text-[11px] text-slate-600 mt-1">
                      <b>Perché:</b> {c.motivo_scelta}
                    </p>
                  )}
                  {c.note && <p className="text-[11px] text-slate-500 italic mt-1">“{c.note}”</p>}
                </div>
                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                  <LinkWhatsApp href={linkWhatsApp(c.cellulare, testo)} />
                  <LinkGmail href={emailValida(c.email) ? linkGmail(c.email, NOME_PROGETTO, testo) : null} />
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
