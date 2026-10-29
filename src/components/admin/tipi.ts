import { Candidato } from "@/types/admin";

export type Vista = "oggi" | "contattare" | "turni" | "pensano" | "rubrica" | "archivio" | "statistiche" | "guida" | "domande" | "admin";

/** Operazioni sul database messe a disposizione delle pagine */
export interface Azioni {
  aggiorna: (id: string, payload: Partial<Candidato>, msgOk?: string) => Promise<boolean>;
  aggiornaMolti: (ids: string[], payload: Partial<Candidato>, msgOk?: string) => Promise<boolean>;
  elimina: (id: string) => Promise<boolean>;
  apriScheda: (id: string) => void;
  vaiA: (v: Vista) => void;
}
