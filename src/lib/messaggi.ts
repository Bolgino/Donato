// Testi già pronti per WhatsApp ed email.
// Si aprono già scritti nella chat: puoi sempre modificarli prima di premere Invia.
// Per cambiarli in modo permanente, modifica le frasi qui sotto.
import { Candidato, Professore } from "@/types/admin";
import { CONFIG_TURNI, fmtData, isGiaDonatore, maiuscolaIniziale, sessoBreve, Turno } from "@/lib/donato";

export const FIRMA = "Gruppo Giovani Donatori Feltre";
export const NOME_PROGETTO = "Progetto Scuole – Giovani Donatori Feltre";

const nome = (c: Candidato) => maiuscolaIniziale(c.nome) || "";

export type TipoMessaggio = "primo" | "inserito" | "confermato" | "promemoria" | "pensaci" | "vuoto";

export const ETICHETTA_MESSAGGIO: Record<TipoMessaggio, string> = {
  primo: "Primo contatto (con le date libere)",
  inserito: "Ti abbiamo messo nel turno",
  confermato: "Turno confermato",
  promemoria: "Promemoria il giorno prima",
  pensaci: "Per chi ci stava pensando",
  vuoto: "Chat vuota",
};

export function msgPrimoContatto(c: Candidato, date: string[]): string {
  const saluto = `Ciao ${nome(c)}! 👋 Siamo il ${FIRMA}. Abbiamo ricevuto la tua adesione al Progetto Scuole, grazie! 🩸`;
  if (date.length === 0) {
    return `${saluto}\n\nTi scriviamo per organizzare la visita di idoneità al ${CONFIG_TURNI.luogo}. In quali giorni saresti disponibile?`;
  }
  const elenco = date.map((d) => `• ${fmtData(d, "giorno")}`).join("\n");
  return `${saluto}\n\nPer la visita di idoneità al ${CONFIG_TURNI.luogo} abbiamo queste date libere:\n${elenco}\n\nQuale ti va meglio? Rispondi pure qui 🙂`;
}

export function msgInserito(c: Candidato, data: string | null): string {
  return `Perfetto ${nome(c)}! Ti abbiamo segnato per ${data ? fmtData(data, "giorno") : "il turno"} al ${CONFIG_TURNI.luogo}. Appena il trasfusionale ci conferma il turno ti scriviamo 👍`;
}

export function msgConfermato(c: Candidato, data: string | null): string {
  return `Ciao ${nome(c)}! Il tuo turno di ${data ? fmtData(data, "giorno") : "visita"} al ${CONFIG_TURNI.luogo} è confermato ✅\nAvvisiamo noi i professori della tua assenza. Per qualsiasi dubbio scrivici qui!`;
}

export function msgPromemoria(c: Candidato, data: string | null): string {
  return `Ciao ${nome(c)}! Ti ricordiamo la visita di ${data ? fmtData(data, "giorno") : "domani"} al ${CONFIG_TURNI.luogo}. Se hai un imprevisto avvisaci subito qui. A presto! 🩸`;
}

export function msgPensaci(c: Candidato): string {
  const entro = c.scadenza_risposta ? ` entro ${fmtData(c.scadenza_risposta, "giorno")}` : "";
  return `Ciao ${nome(c)}! Siamo il ${FIRMA}. Qualche settimana fa ci hai detto che volevi pensarci sulla donazione: hai dubbi o domande? Siamo qui per risponderti.\nSe ti va di partecipare al Progetto Scuole, rispondi a questo messaggio${entro} 🙂`;
}

export function testoMessaggio(tipo: TipoMessaggio, c: Candidato, dateLibere: string[]): string {
  switch (tipo) {
    case "primo":
      return msgPrimoContatto(c, dateLibere);
    case "inserito":
      return msgInserito(c, c.data_disponibilita);
    case "confermato":
      return msgConfermato(c, c.data_disponibilita);
    case "promemoria":
      return msgPromemoria(c, c.data_disponibilita);
    case "pensaci":
      return msgPensaci(c);
    default:
      return "";
  }
}

// ---------- Lista per il trasfusionale ----------
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
  const righe = t.persone.map((c, i) => rigaTrasfusionale(c, i, conTelefono)).join("\n");
  return `${NOME_PROGETTO.toUpperCase()}\nTurno di ${fmtData(t.data, "lunga")} (${t.persone.length} ${t.persone.length === 1 ? "persona" : "persone"})\n\n${righe}`;
}

// ---------- Avviso ai professori ----------
export function oggettoProf(data: string): string {
  return `Assenza studenti ${fmtData(data, "giorno")} – visita per la donazione di sangue`;
}

export function msgProf(prof: Professore | null, scuola: string, data: string, studenti: Candidato[]): string {
  const saluto = prof && (prof.cognome || prof.nome) ? `Gentile prof. ${maiuscolaIniziale(prof.cognome || prof.nome)},` : "Gentile professore/professoressa,";
  const elenco = studenti
    .map((s) => `• ${maiuscolaIniziale(s.nome)} ${maiuscolaIniziale(s.cognome)}${s.classe ? ` – classe ${s.classe.toUpperCase()}` : ""}`)
    .join("\n");
  const verbo = studenti.length === 1 ? "il seguente studente sarà assente perché impegnato" : "i seguenti studenti saranno assenti perché impegnati";
  return `${saluto}\nle comunichiamo che ${fmtData(data, "lunga")} ${verbo} nella visita di idoneità alla donazione di sangue presso il ${CONFIG_TURNI.luogo}, nell'ambito del Progetto Scuole.\n\n${scuola}:\n${elenco}\n\nGrazie per la collaborazione.\n${FIRMA}`;
}
