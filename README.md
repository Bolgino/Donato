# Donato – Progetto Scuole Giovani Donatori Feltre

Web app per raccogliere le adesioni degli studenti alla donazione di sangue e organizzare i turni di visita al Centro Trasfusionale dell'Ospedale di Feltre.

- **`/`** – modulo pubblico che compilano i ragazzi (sì / già donatore / voglio pensarci / no)
- **`/admin`** – area riservata per gestire risposte, turni e avvisi (installabile sul telefono come app)

---

## Come si usa (istruzioni per chi gestisce i turni)

> Le stesse istruzioni sono anche dentro l'app, nella pagina **❓ Guida**, e ogni pagina ha un riquadro **💡 Cosa fare qui**.
> Se non sai da dove iniziare apri **🏠 Oggi**: elenca cosa c'è da fare adesso, con un pulsante per ogni cosa.

### Il percorso di ogni ragazzo

| # | Cosa succede | Dove | Cosa tocchi |
|---|---|---|---|
| 1 | Arriva la risposta dal modulo | 💬 **Da contattare** | — |
| 2 | Gli scrivi su WhatsApp | Da contattare | **💬 WhatsApp**: la chat si apre con il messaggio già scritto e le prime date libere *in cui quella persona può andare* |
| 3 | Quando risponde lo metti in un turno | Da contattare | **📅 Metti in turno** → scegli la data |
| 4 | Mandi la lista al trasfusionale | 📅 **Turni** | **📋 Lista da fotografare** → screenshot (oppure *Copia testo*) → spunta *Inviata* |
| 5 | Il trasfusionale conferma | Turni | **persona per persona**: **✅ Conferma** se accettata, **✕ Togli** se no (motivo + da quando ricontattarla → torna in "Da ricontattare") |
| 6 | Avvisi i prof che i ragazzi saranno assenti | Turni | per ogni scuola c'è il messaggio pronto con nomi e classi → **WhatsApp** o **Email** → spunta *Prof avvisati* |
| 7 | Il giorno prima mandi il promemoria | Turni | un pulsante WhatsApp per ogni ragazzo |

### Le pagine

- **🏠 Oggi** – la lista delle cose da fare: nuove risposte, persone da ricontattare, liste da mandare, turni da confermare, prof da avvisare, promemoria.
- **💬 Da contattare** – chi ha detto sì (nuovi, già donatori, da ricontattare) e non è ancora in un turno. Da qui anche l'export per **Google Contatti** (*Seleziona i non salvati → Scarica file*, poi contacts.google.com → Importa).
- **📅 Turni** – un riquadro per ogni data (come i blocchi "Turno M14/10" dell'Excel) con i 4 passi: lista, conferma di ogni persona, prof, promemoria. Pallino giallo = da confermare, verde = confermato. I turni passati sono in fondo.
- **🤔 Ci pensano** – chi ha risposto "Voglio pensarci". Dopo un mese scrivigli, imposta una scadenza, poi *Vuole partecipare* (va in Da contattare) o *Non interessato* (va in archivio).
- **👩‍🏫 Rubrica prof** – i referenti delle scuole. Scrivi il nome della scuola **uguale a quello del modulo** (te lo suggerisce): così l'avviso viene abbinato da solo.
- **🗂 Archivio** – tutte le risposte (anche i "No"), export Excel per anno scolastico, eliminazione.
- **📊 Statistiche** – **accompagnati per anno scolastico e per scuola** (come il foglio "Rendimento annuale" dell'Excel, calcolati sulle persone confermate: già andate + in programma, con la % sulle risposte "sì"), più le risposte per scuola.

Toccando un nome si apre la **scheda della persona**: tutti i dati, il messaggio WhatsApp/email già pronto (si può scegliere quale) e i pulsanti per spostarla di fase (metti in turno, sposta, togli dal turno, da ricontattare, non partecipa, elimina).

### Regole che l'app controlla da sola

- Turni il **martedì e giovedì**, massimo **4 persone**, date proposte da almeno **5 giorni** da oggi (con *"Altra data concordata con il trasfusionale…"* puoi scegliere qualsiasi giorno).
- **Minorenni**: non possono essere messi in turni prima del 18° compleanno (le date successive sì).
- **3 mesi** (90 giorni) dall'ultima donazione/visita prima di poter tornare.
- **Già donatore** fermo da più di **2 anni**: quando lo metti in turno torna "aspirante".
- **Da ricontattare dal giorno X**: niente turni prima di quel giorno.

### Dati personali

Nel database ci sono dati di ragazzi, anche minorenni, e informazioni sulla salute.
Lista solo al trasfusionale, avvisi solo al prof della scuola giusta; cancella screenshot e file CSV quando non servono più; su dispositivi non tuoi tocca sempre **Disconnetti** (l'accesso dura comunque solo finché la scheda è aperta).
Le spunte *Inviata* e *Prof avvisati* sono salvate solo sul dispositivo (contengono solo la data del turno, nessun dato personale).

---

## Parte tecnica

Next.js 16 (App Router) + React 19 + Tailwind 4, database e login su Supabase, deploy su Vercel.

### Variabili d'ambiente (Vercel → Settings → Environment Variables, o `.env.local` in locale)

| Nome | A cosa serve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chiave pubblica (modulo e area admin) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo per `/keep-alive`, il cron giornaliero di `vercel.json` che evita la pausa del progetto Supabase gratuito |

### Avvio in locale

```bash
npm install
npm run dev     # http://localhost:3000 (modulo) e http://localhost:3000/admin
```

### Dove sono le cose

| File | Contenuto |
|---|---|
| `src/app/page.tsx` | modulo pubblico |
| `src/app/admin/page.tsx` | area admin: login, caricamento dati, scelta della pagina |
| `src/lib/donato.ts` | **tutta la logica**: fasi, regole dei turni, idoneità, link WhatsApp/Gmail, export CSV. In cima c'è `CONFIG_TURNI` (giorni, posti, preavviso, luogo) |
| `src/lib/messaggi.ts` | **testi dei messaggi** WhatsApp/email (primo contatto, turno, promemoria, lista trasfusionale, avviso prof) |
| `src/lib/scuole.ts` | elenco scuole del modulo (usato anche dalla rubrica) |
| `src/components/admin/Vista*.tsx` | una pagina dell'area admin per file |
| `src/components/admin/SchedaPersona.tsx` | la scheda che si apre toccando un nome |

### Stati nel database

L'area admin usa le stesse colonne e gli stessi valori di sempre (nessuna migrazione).
`tipo_adesione`: `Aspirante`, `Già Donatore`, `Voglio pensarci`, `No`.
`shift_status` → pagina in cui compare:

| `shift_status` | Pagina |
|---|---|
| `Da Valutare`, `In Attesa` (o vuoto) | Da contattare |
| `Da Ricontattare` (+ `data_ricontatto`, `note_ricontatto`) | Da contattare → filtro "Da ricontattare" |
| `Contattato` (+ `data_disponibilita`) | Turni, da confermare |
| `Confermato` (+ `data_disponibilita`) | Turni, confermato |

### Sicurezza (da controllare su Supabase)

- Tabella `candidature`: il ruolo `anon` deve poter fare **solo INSERT** (il modulo); lettura/modifica/cancellazione solo agli utenti autenticati.
- In **Authentication → Sign In / Providers** disattiva *"Allow new users to sign up"*: altrimenti chiunque potrebbe crearsi un account e leggere i dati. In alternativa limita le policy alle email degli amministratori.
