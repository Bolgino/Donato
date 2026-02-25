export interface Candidato {
  id: string;
  created_at: string;
  nome: string;
  cognome: string;
  data_nascita: string | null;
  ha_fatto_ecg: boolean | null;
  istituto: string;
  classe: string | null;
  cellulare: string;
  email: string;
  tipo_adesione: string;
  shift_status: 'Da Valutare' | 'Contattato' | 'Confermato' | 'Da Ricontattare';
  data_disponibilita: string | null;
  note_ricontatto: string | null;
  motivo_scelta: string | null;
  data_ultima_donazione: string | null;
}

export interface Professore {
  id: string;
  scuola: string;
  nome: string;
  cognome: string;
  mail: string;
  cell: string;
}
