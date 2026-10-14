"use client";
import { ReactNode } from "react";
import { CONFIG_TURNI, GIORNI_STOP_DOPO_DONAZIONE, ANNI_DONATORE_SCADUTO } from "@/lib/donato";
import { Vista } from "./tipi";

function Blocco({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-sm text-slate-700 leading-relaxed">
      <h3 className="text-base font-black text-slate-800">{titolo}</h3>
      {children}
    </section>
  );
}

function Domanda({ d, children }: { d: string; children: ReactNode }) {
  return (
    <details className="border-b border-slate-100 last:border-0 py-2">
      <summary className="cursor-pointer font-bold text-slate-800">{d}</summary>
      <div className="mt-2 text-slate-600">{children}</div>
    </details>
  );
}

const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

export default function VistaGuida({ vaiA }: { vaiA: (v: Vista) => void }) {
  const Link = ({ v, children }: { v: Vista; children: ReactNode }) => (
    <button onClick={() => vaiA(v)} className="font-bold text-red-600 underline">
      {children}
    </button>
  );
  const giorniTurno = CONFIG_TURNI.giorniSettimana.map((g) => GIORNI[g]).join(" e ");

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Blocco titolo="In breve: il percorso di ogni ragazzo">
        <ol className="list-decimal ml-5 space-y-2">
          <li>
            <b>Arrivano le risposte</b> dal modulo (la pagina pubblica del sito). Chi dice sì finisce in <Link v="contattare">Da contattare</Link>, chi vuole pensarci in{" "}
            <Link v="pensano">Ci pensano</Link>, chi dice no solo in <Link v="archivio">Archivio</Link>.
          </li>
          <li>
            <b>Scrivi su WhatsApp</b>: in Da contattare tocca 💬 WhatsApp. Si apre la chat con il messaggio già scritto e le prime date libere in cui quella persona può andare.
          </li>
          <li>
            <b>Mettilo nel turno</b>: quando risponde tocca 📅 Metti in turno e scegli la data. Ora è nella pagina <Link v="turni">Turni</Link> con il pallino giallo (da confermare).
          </li>
          <li>
            <b>Manda la lista al trasfusionale</b>: nel turno tocca 📋 Lista da fotografare, fai uno screenshot e mandalo (o usa Copia testo). Spunta &quot;Inviata&quot;.
          </li>
          <li>
            <b>Conferma il turno</b>: quando il trasfusionale risponde, tocca ✅ Conferma il turno. I pallini diventano verdi.
          </li>
          <li>
            <b>Avvisa i prof</b>: nel turno, al passo 3, per ogni scuola c&apos;è il messaggio pronto con nomi e classi. Mandalo via WhatsApp o email e spunta &quot;Prof avvisati&quot;.
          </li>
          <li>
            <b>Il giorno prima</b> manda il promemoria ai ragazzi (passo 4 del turno).
          </li>
        </ol>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
          Non sai da dove iniziare? Apri <Link v="oggi">Oggi</Link>: ti dice cosa c&apos;è da fare adesso, con un pulsante per ogni cosa.
        </p>
      </Blocco>

      <Blocco titolo="Le regole che l'app controlla da sola">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            I turni sono il <b>{giorniTurno}</b>, con massimo <b>{CONFIG_TURNI.postiPerTurno} persone</b>, e si propongono date ad almeno <b>{CONFIG_TURNI.giorniPreavviso} giorni</b> da oggi.
          </li>
          <li>
            I <b>minorenni</b> non si possono mettere in un turno prima del loro 18° compleanno (le date dopo il compleanno invece sì).
          </li>
          <li>
            Chi ha donato o fatto la visita da meno di <b>{GIORNI_STOP_DOPO_DONAZIONE} giorni</b> può andare solo dopo: le date troppo vicine sono bloccate.
          </li>
          <li>
            Un <b>già donatore</b> che non dona da più di {ANNI_DONATORE_SCADUTO} anni, quando lo metti in turno, torna &quot;aspirante&quot;.
          </li>
          <li>
            Chi è <b>da ricontattare dal giorno X</b> non può essere messo in turni prima di quel giorno.
          </li>
        </ul>
      </Blocco>

      <Blocco titolo="Domande frequenti">
        <Domanda d="Un ragazzo non può più venire al turno">
          Tocca il suo nome (in Turni) → <b>Togli dal turno</b> (torna tra i &quot;Da ricontattare&quot;) oppure <b>Sposta in un&apos;altra data</b>.
        </Domanda>
        <Domanda d="Il trasfusionale propone una data diversa">
          Nella scheda, sotto le date, tocca <b>&quot;Altra data concordata con il trasfusionale…&quot;</b> e scegli il giorno. Per spostare tutto un turno, sposta le persone una alla volta.
        </Domanda>
        <Domanda d="Il turno è pieno ma devo aggiungere qualcuno">
          Le date piene non vengono proposte, ma con &quot;Altra data…&quot; puoi sceglierla lo stesso: l&apos;app ti chiede conferma.
        </Domanda>
        <Domanda d="Ho confermato per sbaglio">
          Apri la scheda della persona e tocca <b>↩ Torna &quot;da confermare&quot;</b>.
        </Domanda>
        <Domanda d="Nel passo 'Avvisa i prof' dice che non c'è nessun prof">
          Vai in <Link v="rubrica">Rubrica prof</Link> e aggiungi il referente, scrivendo il nome della scuola <b>uguale a quello del modulo</b> (te lo suggerisce). Nel frattempo puoi usare &quot;Copia testo&quot;.
        </Domanda>
        <Domanda d="Come salvo i numeri nella rubrica del telefono?">
          In Da contattare tocca <b>Seleziona i non salvati</b> → <b>Scarica file</b>. Poi apri contacts.google.com → Importa → scegli il file. Le persone esportate non compaiono più come &quot;non salvato&quot;.
        </Domanda>
        <Domanda d="Posso cambiare il testo dei messaggi?">
          Sì: il messaggio si apre già scritto in WhatsApp/Gmail e puoi modificarlo prima di inviarlo. Nella scheda della persona puoi anche scegliere un altro messaggio pronto dal menu.
        </Domanda>
        <Domanda d="Le spunte 'Inviata' e 'Prof avvisati' non le vedo su un altro telefono">
          Sono salvate solo sul dispositivo dove le hai messe. La conferma del turno invece è salvata per tutti.
        </Domanda>
        <Domanda d="Come installo l'app sul telefono?">
          Su Android/Chrome usa il pulsante <b>Installa App</b> nel menu. Su iPhone: Safari → Condividi → &quot;Aggiungi alla schermata Home&quot;.
        </Domanda>
      </Blocco>

      <Blocco titolo="🔒 Dati personali: attenzione">
        <ul className="list-disc ml-5 space-y-1">
          <li>Qui ci sono dati di ragazzi, anche minorenni, e informazioni sulla salute (ECG, donazioni). Usali solo per il progetto.</li>
          <li>Manda la lista solo al trasfusionale e gli avvisi solo al prof della scuola giusta.</li>
          <li>Cancella dal telefono gli screenshot e i file CSV quando non servono più.</li>
          <li>
            L&apos;accesso dura finché la scheda del browser è aperta. Su un dispositivo non tuo tocca sempre <b>Disconnetti</b>.
          </li>
        </ul>
      </Blocco>
    </div>
  );
}
