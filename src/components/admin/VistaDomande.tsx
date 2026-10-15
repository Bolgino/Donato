"use client";
// Domande frequenti dei ragazzi: risposte pronte da copiare in WhatsApp.
import toast from "react-hot-toast";
import { copiaTesto } from "@/lib/donato";
import { Domanda, DOMANDE_RAGAZZI } from "@/lib/domande";
import { DOCUMENTI_ULSS, urlDocumento } from "@/lib/messaggi";
import { Istruzioni, Vuoto } from "./ui";

const TEMI: Domanda["tema"][] = ["Visita e requisiti", "Salute", "Abitudini", "Midollo"];

export default function VistaDomande({ ricerca }: { ricerca: string }) {
  const q = ricerca.trim().toLowerCase();
  const trovate = DOMANDE_RAGAZZI.filter((x) => !q || `${x.d} ${x.r}`.toLowerCase().includes(q));

  const copia = async (testo: string) => {
    if (await copiaTesto(testo)) toast.success("Risposta copiata: incollala nella chat");
    else toast.error("Non sono riuscito a copiare: seleziona il testo a mano.");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Istruzioni id="domande">
        <p>
          Le domande che i ragazzi fanno più spesso, con la risposta da dare. Tocca una domanda per leggere la risposta e <b>📋 Copia</b> per incollarla in WhatsApp.
        </p>
        <p className="text-xs">Per tutto il resto rimanda ai due documenti dell&apos;ULSS qui sotto o al medico del trasfusionale durante la visita.</p>
      </Istruzioni>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm space-y-2">
        <p className="font-bold text-slate-700">📎 Documenti ULSS (sono anche nel messaggio del turno)</p>
        {DOCUMENTI_ULSS.map((d) => (
          <a key={d.file} href={urlDocumento(d.file)} target="_blank" rel="noopener noreferrer" className="block font-semibold text-blue-700 underline">
            {d.titolo}
          </a>
        ))}
      </div>

      {trovate.length === 0 ? (
        <Vuoto titolo="Nessuna domanda trovata.">Prova con un&apos;altra parola (es. tatuaggio, peso, asma).</Vuoto>
      ) : (
        TEMI.map((tema) => {
          const delTema = trovate.filter((x) => x.tema === tema);
          if (delTema.length === 0) return null;
          return (
            <section key={tema} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <h3 className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500">{tema}</h3>
              <div className="divide-y divide-slate-100">
                {delTema.map((x) => (
                  <details key={x.d} className="px-4 py-3 group" open={!!q}>
                    <summary className="cursor-pointer font-bold text-slate-800 text-sm">{x.d}</summary>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{x.r}</p>
                    <button onClick={() => copia(x.r)} className="mt-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-200">
                      📋 Copia risposta
                    </button>
                  </details>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
