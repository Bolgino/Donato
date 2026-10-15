// Stati salvati nel database (colonna candidature.shift_status).
// NON cambiare questi valori: sono quelli già presenti nei dati.
//  - "Da Valutare"     → risposta nuova, ancora da contattare
//  - "In Attesa"       → da contattare (arriva da "Ci voglio pensare" o da "Già donatore")
//  - "Da Ricontattare" → da risentire più avanti (eventualmente da una certa data)
//  - "Contattato"      → inserito in un turno, il ragazzo deve ancora confermare
//  - "Confermato"      → il ragazzo ha confermato che ci sarà
export type ShiftStatus = 'Da Valutare' | 'Contattato' | 'Confermato' | 'Da Ricontattare' | 'In Attesa';

export interface Candidato {
  id: string;
  created_at: string;
  nome: string;
  cognome: string;
  sesso?: string | null;
  data_nascita: string | null;
  ha_fatto_ecg: boolean | null;
  istituto: string;
  classe: string | null;
  cellulare: string;
  email: string;
  tipo_adesione: string;
  shift_status: ShiftStatus | null;
  data_disponibilita: string | null;
  note_ricontatto: string | null;
  motivo_scelta: string | null;
  data_ultima_donazione: string | null;
  data_ricontatto?: string | null;
  scadenza_risposta?: string | null;
  note?: string | null;
  consenso_privacy?: boolean | null;
  consenso_multimediale?: boolean | null;
  esportato_csv?: boolean;
}

export interface Professore {
  id: string;
  scuola: string;
  nome: string;
  cognome: string;
  mail: string;
  cell: string;
}
