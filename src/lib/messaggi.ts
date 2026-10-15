// Testi dei messaggi che il gruppo usa davvero (dai documenti "Messaggio interessati al progetto",
// "Messaggio reminder" e "Lettera indecisi"). Si aprono già scritti in WhatsApp/Gmail:
// si possono sempre modificare prima di premere Invia.
// I ragazzi vanno sempre da soli (senza accompagnatore): i testi spiegano come arrivare.
import { Candidato, Professore } from "@/types/admin";
import { CONFIG_TURNI, fmtData, isGiaDonatore, maiuscolaIniziale, sessoBreve, Turno } from "@/lib/donato";

export const FIRMA = "Fidas Feltre – Gruppo Giovani Donatori";
export const NOME_PROGETTO = "Progetto Scuole – Giovani Donatori Feltre";

// ---------- I due file dell'ULSS da mandare con il primo messaggio ----------
export const DOCUMENTI_ULSS = [
  { titolo: "Modulo pre-donazione (consigli utili ai donatori)", file: "consigli-utili-donatori.pdf" },
  { titolo: "Modulo sospensione dalla donazione", file: "promemoria-sospensione-donazione.pdf" },
];

export function urlDocumento(file: string): string {
  const origine = typeof window !== "undefined" ? window.location.origin : "";
  return `${origine}/documenti/${file}`;
}

// ---------- Tipi di messaggio ----------
export type TipoMessaggio = "turno" | "promemoria" | "indecisi" | "vuoto";

export const ETICHETTA_MESSAGGIO: Record<TipoMessaggio, string> = {
  turno: "Messaggio del turno (data + 2 file ULSS)",
  promemoria: "Promemoria il giorno prima",
  indecisi: "Mail per chi ci sta pensando (solo email)",
  vuoto: "Chat vuota",
};

/** I messaggi che vanno solo per email */
export const SOLO_EMAIL: TipoMessaggio[] = ["indecisi"];

const giorno = (data: string | null) => (data ? fmtData(data, "giorno") : "il giorno della visita");

/** "Messaggio interessati al progetto": si manda quando il ragazzo è stato messo in un turno */
export function msgTurno(c: Candidato, data: string | null): string {
  const allegati = DOCUMENTI_ULSS.map((d) => `📎 ${d.titolo}: ${urlDocumento(d.file)}`).join("\n");
  return `Ciao!

Sono dei Giovani Donatori di Feltre! Ti ringrazio per la tua disponibilità a voler diventare un donatore di sangue! 🩸

Ti scrivo per darti alcuni dettagli sulla tua visita di idoneità, fissata per ${giorno(data)}. Ti dovrai presentare alle ${CONFIG_TURNI.orario} al Centro Trasfusionale: entra dal vecchio ingresso dell'ospedale di Feltre e segui il corridoio fino a quando trovi il cartello "centro prelievi donatori di sangue". Quando avrai finito, potrai andartene e la tua assenza sarà giustificata (ricordati di portare a scuola il *certificato medico* che potrai richiedere direttamente in trasfusionale).

Se hai fatto un ELETTROCARDIOGRAMMA negli ultimi due anni, portalo con te! Se non l'hai fatto ma pratichi uno sport a livello agonistico, fallo presente alla dottoressa durante il colloquio.

Non dimenticare di portare con te la CARTA D'IDENTITÀ e la TESSERA SANITARIA, e di dare un'occhiata al modulo pre-donazione allegato per le istruzioni!!

Se hai meno di 50 kg di peso corporeo o sei affetto da asma bronchiale, purtroppo non è possibile accettare la tua donazione. Per quanto riguarda l'asma allergica invece, potrai donare nei periodi asintomatici!! Per qualsiasi dubbio, controlla il modulo di sospensione dalla donazione in allegato.

Inoltre, se lo desideri, hai l'occasione di essere pre-inserito per la donazione di midollo osseo! (a volte è più necessario di una trasfusione!) La prima volta che donerai il sangue, ti sarà prelevata una piccola provetta in più da analizzare e inserirti nel registro mondiale!! Se sei interessato, scrivimi.

L'appuntamento è ${giorno(data)} alle ${CONFIG_TURNI.orario}! Fammi sapere al più presto se ci sarai, altrimenti ci organizziamo per un'altra data.

Se hai domande, non esitare a contattarmi!

P.S. Questo messaggio è solo per te e per gli altri ragazzi e ragazze invitati a fare la visita, quindi non inoltrarlo ai tuoi compagni!

${allegati}`;
}

const INIZIO_PROMEMORIA = `Ciao!

Solo un veloce promemoria per domani: non dimenticare la TESSERA SANITARIA e la CARTA D'IDENTITÀ! Ecco un piccolo riassunto delle regole pre-donazione: non assumere zuccheri, latticini o cibi grassi a colazione, meglio optare per qualcosa di leggero, come due fette biscottate (senza nulla, avrete modo di rifarvi dopo!). Se hai L'ELETTROCARDIOGRAMMA, portalo con te!`;

/** "Messaggio reminder": i ragazzi vanno da soli al Centro Trasfusionale */
export function msgPromemoria(): string {
  return `${INIZIO_PROMEMORIA}

Ah, e non dimenticare di richiedere al Trasfusionale il *certificato medico*, con quello sarai segnato fuori classe a scuola, almeno per le ore della visita, e vedi tu se ricordare che sei fuori classe anche ai tuoi amici!

Al Centro Trasfusionale sanno che arrivi: per qualsiasi domanda o dubbio potrai contare su di loro!!💪🏻

Per raggiungere il Centro Trasfusionale, entrate dal vecchio ingresso dell'ospedale di Feltre e seguite il corridoio fino a quando trovate il cartello "centro prelievi donatori di sangue". L'appuntamento è sempre alle ${CONFIG_TURNI.orario}.

Ciao e ci vediamo domani!👋🏻`;
}

// ---------- Mail per chi ci sta pensando ("Lettera indecisi", versione 2) ----------
export const OGGETTO_INDECISI = "Progetto Scuole – Giovani Donatori Feltre";

export function msgIndecisi(scadenza: string | null): string {
  const entro = scadenza ? ` entro il ${fmtData(scadenza, "giornoMese")}` : "";
  return `Ciao!

Siamo i ragazzi che sono stati nella tua classe per parlare della donazione del sangue, ti scriviamo perché avevi manifestato l'intenzione di riflettere se diventare o meno donatore.

Sappiamo che prendere questa decisione non è facile, i tuoi dubbi sono più che motivati, per cui siamo qui per aiutarti!

Il progetto che ti proponiamo prevede di venire con noi al Centro Trasfusionale di Feltre per fare la visita di idoneità (che consiste in una breve visita medica, analisi del sangue ed elettrocardiogramma, se non ne hai già fatto uno negli ultimi 2 anni) al fine di diventare donatore. Sarà una passeggiata insieme!

Ti consigliamo di pensare a questo importante, quanto semplice, passo e se sei interessato, rispondi a questa email e ti daremo alcune date possibili per la visita. Altrimenti, se non sei interessato, nessun problema, non ti disturberemo più.

Ti ricordiamo che donare sangue è facile e sicuro (il prelievo dura meno di 10 minuti!), e che un piccolo contributo può davvero salvare una vita. E sai qual è il bello? La donazione non ha controindicazioni per il donatore e permette di avere sempre sotto controllo il proprio stato di salute grazie a costanti controlli medici e analisi del sangue periodiche e gratuite! Ti garantiamo che la paura dell'ago si può superare facilmente!

Naturalmente, avrai diritto all'assenza giustificata da scuola.

La decisione di diventare donatore va, tuttavia, presa in modo consapevole. Per questo ti invitiamo a consultare i siti www.donareilsangue.it e www.fidas.it per ulteriori informazioni, e se dovessi avere qualunque domanda, non esitare a contattarci qui o su Instagram su @giovani_donatori_feltre.

Non appena avrai deciso, ti preghiamo di rispondere a questa mail, COMUNICANDOCI se intendi partecipare o meno al nostro progetto${entro}, per motivi organizzativi, se possibile.

Grazie mille!

${FIRMA}`;
}

export function testoMessaggio(tipo: TipoMessaggio, c: Candidato): string {
  switch (tipo) {
    case "turno":
      return msgTurno(c, c.data_disponibilita);
    case "promemoria":
      return msgPromemoria();
    case "indecisi":
      return msgIndecisi(c.scadenza_risposta || null);
    default:
      return "";
  }
}

// ---------- Lista per il trasfusionale e i prof (solo i ragazzi confermati) ----------
export function rigaTrasfusionale(c: Candidato, i: number, conTelefono: boolean): string {
  const parti = [
    `${i + 1}. ${(c.cognome || "").trim().toUpperCase()} ${maiuscolaIniziale(c.nome)}`,
    c.data_nascita ? `n. ${fmtData(c.data_nascita)}` : "",
    sessoBreve(c.sesso),
    isGiaDonatore(c.tipo_adesione) ? "già donatore" : "aspirante",
    c.ha_fatto_ecg === null || c.ha_fatto_ecg === undefined ? "" : `ECG ${c.ha_fatto_ecg ? "sì" : "no"}`,
    conTelefono ? c.cellulare : "",
  ].filter(Boolean);
  return parti.join(" – ");
}

export function msgListaTrasfusionale(t: Turno, conTelefono: boolean): string {
  const lista = t.confermati;
  const righe = lista.map((c, i) => rigaTrasfusionale(c, i, conTelefono)).join("\n");
  return `${NOME_PROGETTO.toUpperCase()}\nTurno di ${fmtData(t.data, "lunga")} (${lista.length} ${lista.length === 1 ? "persona" : "persone"})\n\n${righe}`;
}

/** Oggetto della mail ai prof: il contenuto è solo la foto della lista */
export function oggettoProf(data: string): string {
  return `${NOME_PROGETTO} – turno di ${fmtData(data, "giorno")}`;
}

// ---------- Inizio anno: chiedere ai professori se partecipano ----------
export function oggettoInvitoProf(anno: string): string {
  return `Progetto Scuole ${anno} – Giovani Donatori Feltre`;
}

export function msgInvitoProf(prof: Professore | null, anno: string): string {
  const saluto = prof && (prof.cognome || prof.nome) ? `Gentile prof. ${maiuscolaIniziale(prof.cognome || prof.nome)},` : "Gentile professore/professoressa,";
  return `${saluto}\nanche per l'anno scolastico ${anno} il Gruppo Giovani Donatori Feltre vorrebbe proporre il Progetto Scuole: un incontro con le classi sulla donazione di sangue e, per i ragazzi che aderiscono, l'accompagnamento alla visita di idoneità presso il ${CONFIG_TURNI.luogo}.\n\nLa vostra scuola è interessata a partecipare anche quest'anno? Se sì, ci può indicare le classi coinvolte e un periodo indicativo per l'incontro?\n\nGrazie e buon inizio d'anno!\n${FIRMA}`;
}
