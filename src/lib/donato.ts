// Logica dell'area admin: fasi, turni, idoneità, link WhatsApp/Gmail, export CSV.
// Tutto ciò che decide "chi va dove" è qui, così le pagine restano semplici.
import { Candidato, Professore } from "@/types/admin";

// ============================================================
// CONFIGURAZIONE — cambia qui se il trasfusionale cambia le regole
// ============================================================
export const CONFIG_TURNI = {
  /** Giorni in cui si fanno i turni (0 = domenica, 2 = martedì, 4 = giovedì) */
  giorniSettimana: [2, 4],
  /** Persone massime per turno */
  postiPerTurno: 4,
  /** Il primo turno proponibile è almeno tra N giorni */
  giorniPreavviso: 5,
  /** Quante date libere proporre */
  numeroDateProposte: 6,
  /** Dove si fa la visita (compare nei messaggi e nella lista) */
  luogo: "Centro Trasfusionale dell'Ospedale di Feltre",
};

/** Giorni di stop dopo l'ultima donazione / visita */
export const GIORNI_STOP_DOPO_DONAZIONE = 90;
/** Oltre questi anni dall'ultima donazione un "già donatore" torna aspirante */
export const ANNI_DONATORE_SCADUTO = 2;
/** Dopo quanti mesi ricontattare (via mail) chi "ci vuole pensare" */
export const MESI_PRIMA_DI_RISCRIVERE_A_CHI_CI_PENSA = 1;
/** Quanti giorni dare per rispondere alla mail */
export const GIORNI_PER_RISPONDERE = 14;

// ============================================================
// DATE (sempre in ora locale: niente sorprese con il fuso orario)
// ============================================================
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${g}`;
}

export function oggiISO(): string {
  return toISO(new Date());
}

/** Accetta "AAAA-MM-GG" (data) o un timestamp completo */
export function parseData(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

/** Riduce qualsiasi data/timestamp ad "AAAA-MM-GG" */
export function soloData(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(s) && s.length <= 10) return s.slice(0, 10);
  return toISO(parseData(s));
}

export function addGiorni(iso: string, giorni: number): string {
  const d = parseData(iso);
  d.setDate(d.getDate() + giorni);
  return toISO(d);
}

export function addMesi(iso: string, mesi: number): string {
  const d = parseData(iso);
  d.setMonth(d.getMonth() + mesi);
  return toISO(d);
}

export function addAnni(iso: string, anni: number): string {
  const d = parseData(iso);
  d.setFullYear(d.getFullYear() + anni);
  return toISO(d);
}

type StileData = "breve" | "lunga" | "giorno" | "giornoAnno" | "giornoMese";

/** breve: 21/10/2026 · lunga: martedì 21 ottobre 2026 · giorno: martedì 21 ottobre */
export function fmtData(s: string | null | undefined, stile: StileData = "breve"): string {
  if (!s) return "";
  const d = parseData(s);
  if (isNaN(d.getTime())) return s;
  if (stile === "breve") return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (stile === "giorno") return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  if (stile === "giornoAnno") return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  if (stile === "giornoMese") return d.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Prima lettera maiuscola: "martedì 20 ottobre" → "Martedì 20 ottobre" */
export function iniziale(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function giorniDaOggi(iso: string): number {
  const a = parseData(oggiISO()).getTime();
  const b = parseData(soloData(iso)).getTime();
  return Math.round((b - a) / 86400000);
}

/** "oggi", "domani", "tra 3 giorni", "2 giorni fa" */
export function quando(iso: string): string {
  const n = giorniDaOggi(iso);
  if (n === 0) return "oggi";
  if (n === 1) return "domani";
  if (n === -1) return "ieri";
  if (n > 1) return `tra ${n} giorni`;
  return `${-n} giorni fa`;
}

export function calcolaAnnoScolastico(dataString: string): string {
  if (!dataString) return "Sconosciuto";
  const d = new Date(dataString);
  const year = d.getFullYear();
  return d.getMonth() < 8 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
}

// ============================================================
// TIPO DI ADESIONE (valori scritti dal modulo pubblico)
// ============================================================
export const isAspirante = (t?: string | null) => t === "Aspirante" || t === "SI" || t === "SÌ" || t === "Sì";
export const isGiaDonatore = (t?: string | null) => t === "Già Donatore";
export const isPensarci = (t?: string | null) => t === "Voglio pensarci";
export const isNo = (t?: string | null) => t === "No" || t === "NO";

// ============================================================
// FASI: in quale "cassetto" sta ogni persona
// ============================================================
export type Fase =
  | "da_contattare" // nuova risposta, o tornata disponibile
  | "da_ricontattare" // da risentire più avanti
  | "in_turno" // messa in un turno, il ragazzo deve ancora confermare
  | "confermato" // turno confermato
  | "ci_pensa" // ha risposto "Voglio pensarci"
  | "no" // ha detto no
  | "altro";

export function faseDi(c: Candidato): Fase {
  const s = c.shift_status;
  const t = c.tipo_adesione;
  if (s === "Contattato") return "in_turno";
  if (s === "Confermato") return "confermato";
  if (isNo(t)) return "no";
  if (isPensarci(t)) return "ci_pensa";
  if (s === "In Attesa") return "da_contattare";
  if (isAspirante(t) || isGiaDonatore(t)) {
    if (s === "Da Ricontattare") return "da_ricontattare";
    return "da_contattare"; // "Da Valutare" o vuoto
  }
  return "altro";
}

export const ETICHETTA_FASE: Record<Fase, string> = {
  da_contattare: "Da contattare",
  da_ricontattare: "Da ricontattare",
  in_turno: "In turno · deve confermare",
  confermato: "Ha confermato il turno",
  ci_pensa: "Ci sta pensando",
  no: "Ha detto no",
  altro: "—",
};

// ============================================================
// IDONEITÀ: può essere messo in un turno in quella data?
// ============================================================
export function etaAl(nascita: string | null | undefined, alISO: string): number | null {
  if (!nascita) return null;
  const n = parseData(soloData(nascita));
  const a = parseData(alISO);
  let eta = a.getFullYear() - n.getFullYear();
  const compleannoPassato = a.getMonth() > n.getMonth() || (a.getMonth() === n.getMonth() && a.getDate() >= n.getDate());
  if (!compleannoPassato) eta--;
  return eta;
}

export interface Blocco {
  codice: "MINORENNE" | "SOSPESO" | "PAUSA" | "SENZA_NASCITA";
  testo: string;
  /** Primo giorno in cui il blocco non vale più */
  dal?: string;
}

/** Elenco dei motivi per cui la persona NON può essere messa nel turno di quella data (vuoto = ok) */
export function blocchiAl(c: Candidato, dataISO: string, conPausa = true): Blocco[] {
  const out: Blocco[] = [];
  const eta = etaAl(c.data_nascita, dataISO);
  if (eta === null) {
    out.push({ codice: "SENZA_NASCITA", testo: "Manca la data di nascita" });
  } else if (eta < 18) {
    const diciotto = addAnni(soloData(c.data_nascita as string), 18);
    out.push({ codice: "MINORENNE", testo: `Minorenne: compie 18 anni il ${fmtData(diciotto)}`, dal: diciotto });
  }
  if (c.data_ultima_donazione) {
    const sblocco = addGiorni(soloData(c.data_ultima_donazione), GIORNI_STOP_DOPO_DONAZIONE);
    if (sblocco > dataISO) out.push({ codice: "SOSPESO", testo: `Ha donato da poco: può tornare dal ${fmtData(sblocco)}`, dal: sblocco });
  }
  if (conPausa && c.data_ricontatto && soloData(c.data_ricontatto) > dataISO) {
    out.push({ codice: "PAUSA", testo: `Da ricontattare dal ${fmtData(c.data_ricontatto)}`, dal: soloData(c.data_ricontatto) });
  }
  return out;
}

/** Come il vecchio "checkIdoneita": problemi validi OGGI (per i bollini rossi nelle liste) */
export function blocchiOggi(c: Candidato): Blocco[] {
  return blocchiAl(c, oggiISO(), false).filter((b) => b.codice !== "SENZA_NASCITA" || !isNo(c.tipo_adesione));
}

export function statoDonatore(c: Candidato) {
  if (!c.data_ultima_donazione) return { recente: false, scaduto: false, sblocco: null as string | null };
  const ultima = soloData(c.data_ultima_donazione);
  const sblocco = addGiorni(ultima, GIORNI_STOP_DOPO_DONAZIONE);
  return {
    recente: sblocco > oggiISO(),
    scaduto: ultima < addAnni(oggiISO(), -ANNI_DONATORE_SCADUTO),
    sblocco,
  };
}

// ============================================================
// TURNI
// ============================================================
export function occupazioneTurni(tutti: Candidato[]): Record<string, number> {
  const occ: Record<string, number> = {};
  for (const c of tutti) {
    if ((c.shift_status === "Contattato" || c.shift_status === "Confermato") && c.data_disponibilita) {
      const d = soloData(c.data_disponibilita);
      occ[d] = (occ[d] || 0) + 1;
    }
  }
  return occ;
}

export interface Slot {
  data: string;
  occupati: number;
}

/** Primo giorno in cui ha senso proporre un turno a questa persona (dopo preavviso, 18 anni, 3 mesi, pausa) */
export function primaDataUtile(c: Candidato): string {
  let d = addGiorni(oggiISO(), CONFIG_TURNI.giorniPreavviso);
  for (const b of blocchiAl(c, d)) if (b.dal && b.dal > d) d = b.dal;
  return d;
}

/** Prossime date di turno con posti liberi a partire da `dal` (+ eventuali date extra, es. quella attuale della persona) */
export function dateProposte(occ: Record<string, number>, extra: (string | null | undefined)[] = [], dal?: string): Slot[] {
  const out: Slot[] = [];
  let d = dal || addGiorni(oggiISO(), CONFIG_TURNI.giorniPreavviso);
  let giri = 0;
  while (out.length < CONFIG_TURNI.numeroDateProposte && giri < 400) {
    if (CONFIG_TURNI.giorniSettimana.includes(parseData(d).getDay())) {
      const occupati = occ[d] || 0;
      if (occupati < CONFIG_TURNI.postiPerTurno) out.push({ data: d, occupati });
    }
    d = addGiorni(d, 1);
    giri++;
  }
  for (const e of extra) {
    if (!e) continue;
    const s = soloData(e);
    if (!out.some((x) => x.data === s)) out.push({ data: s, occupati: occ[s] || 0 });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

/** Date libere in cui QUELLA persona può andare (usate nel primo messaggio WhatsApp) */
export function dateLibere(c: Candidato, occ: Record<string, number>, max = 4): string[] {
  return dateProposte(occ, [], primaDataUtile(c))
    .filter((s) => blocchiAl(c, s.data).length === 0)
    .map((s) => s.data)
    .slice(0, max);
}

export interface Turno {
  data: string;
  persone: Candidato[];
  daConfermare: Candidato[];
  confermati: Candidato[];
  passato: boolean;
}

export function raggruppaTurni(tutti: Candidato[]): Turno[] {
  const mappa: Record<string, Candidato[]> = {};
  for (const c of tutti) {
    if (c.shift_status !== "Contattato" && c.shift_status !== "Confermato") continue;
    const d = c.data_disponibilita ? soloData(c.data_disponibilita) : "senza-data";
    (mappa[d] = mappa[d] || []).push(c);
  }
  const oggi = oggiISO();
  return Object.entries(mappa)
    .map(([data, persone]) => ({
      data,
      persone: [...persone].sort((a, b) => (a.cognome || "").localeCompare(b.cognome || "")),
      daConfermare: persone.filter((p) => p.shift_status === "Contattato"),
      confermati: persone.filter((p) => p.shift_status === "Confermato"),
      passato: data !== "senza-data" && data < oggi,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// ============================================================
// ACCOMPAGNATI (come il foglio "Rendimento annuale" dell'Excel)
// Conta le persone CONFERMATE, per anno scolastico della data del turno.
// ============================================================
export interface AnnoAccompagnati {
  anno: string;
  /** Confermati con turno già passato (o oggi) */
  fatti: number;
  /** Confermati con turno ancora da fare */
  inProgramma: number;
  /** Risposte "sì" (aspiranti + già donatori) arrivate in quell'anno scolastico */
  si: number;
}

export function annoScolasticoDi(iso: string): string {
  const d = parseData(soloData(iso));
  const y = d.getFullYear();
  return d.getMonth() < 8 ? `${y - 1}-${y}` : `${y}-${y + 1}`;
}

export function accompagnati(tutti: Candidato[]) {
  const oggi = oggiISO();
  const perAnno: Record<string, AnnoAccompagnati> = {};
  const perScuola: Record<string, Record<string, number>> = {};
  const riga = (anno: string) => (perAnno[anno] = perAnno[anno] || { anno, fatti: 0, inProgramma: 0, si: 0 });

  for (const c of tutti) {
    if (c.shift_status === "Confermato" && c.data_disponibilita) {
      const data = soloData(c.data_disponibilita);
      const anno = annoScolasticoDi(data);
      if (data <= oggi) riga(anno).fatti++;
      else riga(anno).inProgramma++;
      const scuola = c.istituto || "Non specificato";
      perScuola[scuola] = perScuola[scuola] || {};
      perScuola[scuola][anno] = (perScuola[scuola][anno] || 0) + 1;
    }
    if (isAspirante(c.tipo_adesione) || isGiaDonatore(c.tipo_adesione) || c.shift_status === "Contattato" || c.shift_status === "Confermato") {
      riga(calcolaAnnoScolastico(c.created_at)).si++;
    }
  }
  const anni = Object.keys(perAnno).sort().reverse();
  return { anni, perAnno, perScuola };
}

// ============================================================
// CONTATTI: WhatsApp, Gmail, appunti
// ============================================================
/** Restituisce il numero in formato internazionale per wa.me (es. 393401234567) o null se non valido */
export function numeroWhatsApp(cell: string | null | undefined): string | null {
  if (!cell) return null;
  let n = cell.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.length < 9) return null;
  if (n.length === 12 && n.startsWith("39")) return n; // già con prefisso
  if (n.length <= 10) return "39" + n;
  return n;
}

export function linkWhatsApp(cell: string | null | undefined, testo?: string): string | null {
  const n = numeroWhatsApp(cell);
  if (!n) return null;
  return `https://wa.me/${n}${testo ? `?text=${encodeURIComponent(testo)}` : ""}`;
}

/** WhatsApp senza destinatario: scegli tu la chat (es. trasfusionale) */
export function linkWhatsAppLibero(testo: string): string {
  return `https://wa.me/?text=${encodeURIComponent(testo)}`;
}

export function emailValida(e: string | null | undefined): e is string {
  return !!e && e !== "N/A" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function linkGmail(to: string, oggetto?: string, corpo?: string): string {
  let url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}`;
  if (oggetto) url += `&su=${encodeURIComponent(oggetto)}`;
  if (corpo) url += `&body=${encodeURIComponent(corpo)}`;
  return url;
}

/** Una sola mail a più persone, in copia nascosta (nessuno vede gli indirizzi degli altri) */
export function linkGmailCcn(destinatari: string[], oggetto: string, corpo: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(destinatari.join(","))}&su=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
}

export async function copiaTesto(testo: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(testo);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = testo;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// ============================================================
// SCUOLE ↔ PROFESSORI
// ============================================================
export function normScuola(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const PAROLE_VUOTE = new Set(["di", "del", "della", "delle", "dei", "degli", "e", "ed", "istituto", "scuola"]);

/** Parole significative del nome di una scuola: "ITIS Negrelli e Forcellini" → itis, negrelli, forcellini */
function paroleScuola(s: string | null | undefined): string[] {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 2 && !PAROLE_VUOTE.has(p));
}

/** Prof della rubrica abbinati alla scuola: nome uguale, oppure tutte le parole di uno sono contenute nell'altro */
export function profPerScuola(profs: Professore[], scuola: string): Professore[] {
  const s = normScuola(scuola);
  if (!s) return [];
  const esatti = profs.filter((p) => normScuola(p.scuola) === s);
  if (esatti.length) return esatti;
  const ps = paroleScuola(scuola);
  return profs.filter((p) => {
    const pp = paroleScuola(p.scuola);
    if (!pp.length || !ps.length) return false;
    return pp.every((w) => ps.includes(w)) || ps.every((w) => pp.includes(w));
  });
}

// ============================================================
// TESTI DI SUPPORTO
// ============================================================
export function nomeCompleto(c: { nome?: string | null; cognome?: string | null }): string {
  return `${(c.nome || "").trim()} ${(c.cognome || "").trim()}`.trim() || "Senza nome";
}

export function maiuscolaIniziale(s: string | null | undefined): string {
  return (s || "")
    .trim()
    .split(/\s+/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(" ");
}

/** "nato" / "nata" / "nato/a" in base al sesso indicato nel modulo */
export function nato(sesso: string | null | undefined): string {
  if (sesso === "Femmina") return "nata";
  if (sesso === "Maschio") return "nato";
  return "nato/a";
}

export function sessoBreve(s: string | null | undefined): string {
  if (!s) return "";
  if (s === "Maschio") return "M";
  if (s === "Femmina") return "F";
  return s;
}

export function contiene(c: Candidato, q: string): boolean {
  if (!q.trim()) return true;
  const testo = `${c.nome} ${c.cognome} ${c.istituto} ${c.classe || ""} ${c.cellulare} ${c.email}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => testo.includes(p));
}

// ============================================================
// EXPORT CSV (stesso formato di prima)
// ============================================================
function scarica(nomeFile: string, contenuto: string) {
  const blob = new Blob([contenuto], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", nomeFile);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** File da importare in Google Contatti (contacts.google.com → Importa) */
export function scaricaCsvGoogleContatti(lista: Candidato[]) {
  const header =
    "Name Prefix;First Name;Middle Name;Last Name;Name Suffix;Phonetic First Name;Phonetic Middle Name;Phonetic Last Name;Nickname;E-mail 1 - Label;E-mail 1 - Value;Phone 1 - Label;Phone 1 - Value;Address 1 - Label;Address 1 - Country;Address 1 - Street;Address 1 - Extended Address;Address 1 - City;Address 1 - Region;Address 1 - Postal Code;Address 1 - PO Box;Organization Name;Organization Title;Organization Department;Birthday;Event 1 - Label;Event 1 - Value;Relation 1 - Label;Relation 1 - Value;Website 1 - Label;Website 1 - Value;Custom Field 1 - Label;Custom Field 1 - Value;Notes;Labels";
  const rows = lista
    .map((c) => {
      const nome = c.nome ? c.nome.replace(/;/g, " ") : "";
      const cognome = c.cognome ? c.cognome.replace(/;/g, " ") : "";
      const telefono = c.cellulare ? c.cellulare.replace(/\D/g, "") : "";
      const email = c.email ? c.email.replace(/;/g, " ") : "";
      const scuola = c.istituto ? c.istituto.replace(/;/g, " ") : "";
      const classe = c.classe ? c.classe.replace(/;/g, " ") : "";
      const note = `Scuola: ${scuola} - Classe: ${classe}`;
      return `;${nome};;${cognome};;;;;;;${email};;${telefono};;;;;;;;;;;;;;;;;;;;${note};`;
    })
    .join("\r\n");
  scarica(`Donato_Contatti_${oggiISO()}.csv`, "﻿" + header + "\r\n" + rows);
}

/** Archivio completo (si apre con Excel) */
export function scaricaCsvArchivio(lista: Candidato[], anno: string) {
  const headers = [
    "Data Iscrizione", "Nome", "Cognome", "Sesso", "Data Nascita",
    "Cellulare", "Email", "Istituto", "Classe", "Adesione",
    "Stato Smistamento", "Data Visita", "Motivo Scelta",
    "Da Ricontattare Dal", "Note Ricontatto", "Note Generali",
    "Ultima Donazione", "Ha Fatto ECG", "Privacy", "Media",
  ].join(";");
  const d = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("it-IT") : "");
  const rows = lista
    .map((c) =>
      [
        d(c.created_at),
        c.nome || "",
        c.cognome || "",
        c.sesso || "",
        c.data_nascita ? fmtData(c.data_nascita) : "",
        c.cellulare || "",
        c.email || "",
        c.istituto || "",
        c.classe || "",
        c.tipo_adesione || "",
        c.shift_status || "",
        c.data_disponibilita ? fmtData(c.data_disponibilita) : "",
        c.motivo_scelta || "",
        c.data_ricontatto ? fmtData(c.data_ricontatto) : "",
        c.note_ricontatto || "",
        c.note || "",
        c.data_ultima_donazione ? fmtData(c.data_ultima_donazione) : "",
        c.ha_fatto_ecg !== null && c.ha_fatto_ecg !== undefined ? (c.ha_fatto_ecg ? "SI" : "NO") : "",
        c.consenso_privacy ? "SI" : "NO",
        c.consenso_multimediale ? "SI" : "NO",
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\r\n");
  scarica(`Archivio_${anno.replace("/", "-")}_${oggiISO()}.csv`, "﻿" + headers + "\r\n" + rows);
}

// ============================================================
// SPUNTE DEI TURNI ("lista inviata", "prof avvisati")
// Salvate solo su questo dispositivo: contengono solo date, nessun dato personale.
// ============================================================
export interface SpuntaTurno {
  lista?: boolean;
  prof?: boolean;
}
const CHIAVE_SPUNTE = "donato.turni.v1";

export function leggiSpunte(): Record<string, SpuntaTurno> {
  try {
    const raw = localStorage.getItem(CHIAVE_SPUNTE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function scriviSpunte(s: Record<string, SpuntaTurno>) {
  try {
    localStorage.setItem(CHIAVE_SPUNTE, JSON.stringify(s));
  } catch {
    /* modalità privata o spazio pieno: pazienza */
  }
}

export function leggiPreferenza(chiave: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem("donato.pref." + chiave);
    return v === null ? def : v === "1";
  } catch {
    return def;
  }
}

export function scriviPreferenza(chiave: string, v: boolean) {
  try {
    localStorage.setItem("donato.pref." + chiave, v ? "1" : "0");
  } catch {
    /* ignora */
  }
}
