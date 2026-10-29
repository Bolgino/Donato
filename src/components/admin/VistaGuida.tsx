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
      <Blocco titolo="In breve: come funziona il Progetto Scuole">
        <ol className="list-decimal ml-5 space-y-2">
          <li>
            <b>Inizio anno: chiedi ai prof se la scuola partecipa</b> al Progetto Scuole. In <Link v="rubrica">Rubrica prof</Link>, nel riquadro 📣, c&apos;è il messaggio già
            pronto per ogni referente (WhatsApp o email). Quando hai finito spunta &quot;Fatto&quot;.
          </li>
          <li>
            <b>Raccogli le risposte del modulo</b> (la pagina pubblica del sito). Chi dice sì finisce in <Link v="contattare">Da contattare</Link>, chi vuole pensarci in{" "}
            <Link v="pensano">Ci pensano</Link>, chi dice no solo in <Link v="archivio">Archivio</Link>.
          </li>
          <li>
            <b>Inserisci i ragazzi nei turni e scrivigli</b>. I turni sono le date già concordate prima con il trasfusionale. In Da contattare tocca <b>📅 Metti in turno</b>{" "}
            e scegli la data; subito dopo tocca <b>💬 WhatsApp</b>: si apre il messaggio già scritto con la data, l&apos;orario e il punto d&apos;incontro. Insieme al messaggio
            vanno mandati <b>i 2 file dell&apos;ULSS</b> (modulo pre-donazione e modulo sospensione): i link sono già nel messaggio e con <b>📎 Invia i 2 file ULSS</b> li mandi
            anche come file.
          </li>
          <li>
            <b>Confermi tu i ragazzi</b>. Quando un ragazzo ti dice che è disponibile, nella pagina <Link v="turni">Turni</Link> tocca <b>✅ Segna confermato</b> accanto al suo
            nome (il pallino diventa verde). Se non può, tocca <b>✕ Togli</b> e scrivi il motivo e da quando ricontattarlo. La conferma la dai tu (admin) in base alla
            disponibilità del ragazzo: <b>non è il trasfusionale a confermare</b>.
          </li>
          <li>
            <b>Mandi la foto al trasfusionale e ai prof</b>. Nel turno tocca <b>📋 Lista da fotografare</b>: ci sono solo i ragazzi che hai confermato. Fai lo screenshot e manda
            la stessa foto al trasfusionale e ai prof delle scuole coinvolte (i contatti dei prof sono al passo 3 del turno). <b>Arriva solo la foto</b> delle persone
            coinvolte. Poi spunta &quot;Inviata&quot; e &quot;Prof avvisati&quot;.
          </li>
          <li>
            <b>Il giorno prima</b> mandi il promemoria ai ragazzi che il giorno dopo fanno la donazione: passo 4 del turno, tocca il pulsante WhatsApp di ognuno. I ragazzi
            vanno <b>sempre da soli</b>, senza accompagnatore: il messaggio spiega come arrivare al Centro Trasfusionale.
          </li>
        </ol>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
          Non sai da dove iniziare? Apri <Link v="oggi">Oggi</Link>: ti dice cosa c&apos;è da fare adesso, con un pulsante per ogni cosa.
        </p>
      </Blocco>

      <Blocco titolo="Chi ha risposto &quot;Voglio pensarci&quot;">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            Si ricontatta <b>circa un mese dopo</b> la risposta al modulo e <b>solo via mail</b>, non su WhatsApp.
          </li>
          <li>
            Quando è il momento, in <Link v="pensano">Ci pensano</Link> la persona diventa rossa: tocca <b>✉️ Manda la mail</b>. Si apre Gmail con la lettera già scritta e la
            data entro cui rispondere, che viene salvata. Se sono tanti, c&apos;è <b>Una mail a tutti in Ccn</b>.
          </li>
          <li>
            Quando risponde: <b>✅ Vuole partecipare</b> (passa in Da contattare) oppure <b>❌ Non interessato</b> (va in archivio). Se la scadenza passa senza risposta,
            torna rossa.
          </li>
        </ul>
      </Blocco>

      <Blocco titolo="I messaggi già pronti">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Messaggio del turno</b> (WhatsApp, quando metti un ragazzo in turno): data, orario, come arrivare, cosa portare, i link ai 2 file ULSS. Chiede al
            ragazzo di confermare.
          </li>
          <li>
            <b>Promemoria del giorno prima</b> (WhatsApp): cosa portare, cosa mangiare a colazione e come arrivare al Centro Trasfusionale (i ragazzi vanno da soli).
          </li>
          <li>
            <b>Lettera per chi ci sta pensando</b> (solo mail).
          </li>
          <li>
            I messaggi <b>non contengono nomi né numeri di telefono</b>: se serve, aggiungi tu il tuo nome o il tuo numero in WhatsApp prima di inviare.
          </li>
          <li>
            Per rispondere ai dubbi dei ragazzi usa <Link v="domande">Domande dei ragazzi</Link>: risposte pronte da copiare.
          </li>
        </ul>
      </Blocco>

      <Blocco titolo="Nuovi admin e password">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            In <Link v="admin">Admin</Link> scrivi l&apos;email della persona e tocca <b>✉️ Manda invito</b>. Le arriva una mail: apre il link, sceglie la sua password e da
            lì entra con email e password.
          </li>
          <li>
            Password dimenticata o link scaduto? Nella pagina di accesso scrivi l&apos;email e tocca <b>Password dimenticata?</b>: arriva una mail per sceglierne una nuova.
          </li>
          <li>Quando un volontario smette, in Admin tocca <b>Togli accesso</b>.</li>
        </ul>
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
        <Domanda d="Il trasfusionale deve confermare qualcosa?">
          No. Le date dei turni le concordi prima con il trasfusionale. Poi i ragazzi li confermi tu, in base a quello che ti dicono, e al trasfusionale mandi solo la foto
          della lista.
        </Domanda>
        <Domanda d="Un ragazzo non può più venire al turno">
          In Turni tocca <b>✕ Togli</b> accanto al suo nome, scrivi il motivo e se vuoi da quando ricontattarlo: torna tra i &quot;Da ricontattare&quot;. Per cambiargli data tocca il nome → <b>Sposta in un&apos;altra data</b>.
        </Domanda>
        <Domanda d="Un turno concordato con il trasfusionale non è martedì o giovedì">
          Nella scheda, sotto le date, tocca <b>&quot;Altra data concordata con il trasfusionale…&quot;</b> e scegli il giorno. Per spostare tutto un turno, sposta le persone una alla volta.
        </Domanda>
        <Domanda d="Il turno è pieno ma devo aggiungere qualcuno">
          Le date piene non vengono proposte, ma con &quot;Altra data…&quot; puoi sceglierla lo stesso: l&apos;app ti chiede conferma.
        </Domanda>
        <Domanda d="Ho segnato per sbaglio che un ragazzo ha confermato">
          Nel turno tocca <b>↩ Annulla</b> accanto al suo nome (oppure dalla scheda: <b>↩ Annulla conferma</b>).
        </Domanda>
        <Domanda d="Nel passo dei professori dice che non c'è nessun prof">
          Vai in <Link v="rubrica">Rubrica prof</Link> e aggiungi il referente, scrivendo il nome della scuola <b>uguale a quello del modulo</b> (te lo suggerisce): così nel
          turno trovi il suo contatto per mandargli la foto.
        </Domanda>
        <Domanda d="Un ragazzo conferma dopo che ho già mandato la foto">
          Segnalo confermato, apri di nuovo 📋 Lista da fotografare e rimanda la foto aggiornata al trasfusionale e ai prof.
        </Domanda>
        <Domanda d="Come salvo i numeri nella rubrica del telefono?">
          In Da contattare tocca <b>Seleziona i non salvati</b> → <b>Scarica file</b>. Poi apri contacts.google.com → Importa → scegli il file. Le persone esportate non compaiono più come &quot;non salvato&quot;.
        </Domanda>
        <Domanda d="Quanti ragazzi abbiamo accompagnato quest'anno?">
          In <Link v="statistiche">Statistiche</Link>, tabella <b>Accompagnati al trasfusionale</b>: per ogni anno scolastico conta le persone confermate (già andate e in programma) e
          le divide anche per scuola, come il foglio &quot;Rendimento annuale&quot;. Chi viene tolto da un turno non viene contato.
        </Domanda>
        <Domanda d="Posso cambiare il testo dei messaggi?">
          Sì: il messaggio si apre già scritto in WhatsApp/Gmail e puoi modificarlo prima di inviarlo. Nella scheda della persona puoi anche scegliere un altro messaggio pronto
          dal menu. I testi sono quelli dei vostri documenti (messaggio interessati al progetto, reminder, lettera indecisi); per cambiarli per sempre bisogna modificare il file{" "}
          <code>src/lib/messaggi.ts</code>.
        </Domanda>
        <Domanda d="Come mando i 2 file dell'ULSS?">
          I link ai due PDF sono già in fondo al messaggio del turno. Se vuoi mandarli come file, tocca <b>📎 Invia i 2 file ULSS</b>: sul telefono si apre la condivisione
          (scegli WhatsApp e la chat del ragazzo); sul computer compaiono i due PDF da scaricare e allegare.
        </Domanda>
        <Domanda d="Le spunte 'Inviata' e 'Prof avvisati' non le vedo su un altro telefono">
          Sono salvate solo sul dispositivo dove le hai messe (come la spunta &quot;Fatto&quot; dei prof a inizio anno). Le conferme che segni ai ragazzi invece sono salvate per tutti.
        </Domanda>
        <Domanda d="L'invito non arriva, o il link porta a «localhost»">
          Sono impostazioni di Supabase, da sistemare una volta sola (le trova chi gestisce il progetto Supabase, passo per passo nel README del progetto):
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>
              <b>Link a localhost</b>: in Supabase → Authentication → URL Configuration il &quot;Site URL&quot; deve essere l&apos;indirizzo vero del sito, e tra i
              &quot;Redirect URLs&quot; deve esserci la pagina <code>/admin/imposta-password</code>.
            </li>
            <li>
              <b>Mail che non arrivano</b> (o errore &quot;Email address not authorized&quot;): il servizio email gratuito di Supabase scrive solo ai membri del team
              Supabase e al massimo 2 mail all&apos;ora. Bisogna collegare una casella email vera (SMTP), per esempio il Gmail del gruppo.
            </li>
          </ul>
        </Domanda>
        <Domanda d="Come installo l'app sul telefono?">
          Su Android/Chrome usa il pulsante <b>Installa App</b> nel menu. Su iPhone: Safari → Condividi → &quot;Aggiungi alla schermata Home&quot;.
        </Domanda>
      </Blocco>

      <Blocco titolo="🔒 Dati personali: attenzione">
        <ul className="list-disc ml-5 space-y-1">
          <li>Qui ci sono dati di ragazzi, anche minorenni, e informazioni sulla salute (ECG, donazioni). Usali solo per il progetto.</li>
          <li>Manda la foto della lista solo al trasfusionale e ai prof delle scuole coinvolte.</li>
          <li>Cancella dal telefono gli screenshot e i file CSV quando non servono più.</li>
          <li>
            L&apos;accesso dura finché la scheda del browser è aperta. Su un dispositivo non tuo tocca sempre <b>Disconnetti</b>.
          </li>
        </ul>
      </Blocco>
    </div>
  );
}
