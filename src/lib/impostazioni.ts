"use client";
// Dati usati nei messaggi WhatsApp che NON devono finire nel codice (il repository è pubblico):
// nome e cellulare dell'accompagnatore. Restano salvati solo sul dispositivo dove li scrivi.
import { useEffect, useState } from "react";

export interface Impostazioni {
  /** Chi accompagna i ragazzi (es. il nome della volontaria) */
  accompagnatore: string;
  /** Cellulare dell'accompagnatore, scritto nel promemoria */
  telAccompagnatore: string;
  /** Orario dell'appuntamento al bar dell'ospedale */
  orario: string;
}

export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = { accompagnatore: "", telAccompagnatore: "", orario: "8:45" };

const CHIAVE = "donato.impostazioni.v1";
const EVENTO = "donato-impostazioni";

export function leggiImpostazioni(): Impostazioni {
  try {
    const raw = localStorage.getItem(CHIAVE);
    return raw ? { ...IMPOSTAZIONI_PREDEFINITE, ...JSON.parse(raw) } : IMPOSTAZIONI_PREDEFINITE;
  } catch {
    return IMPOSTAZIONI_PREDEFINITE;
  }
}

export function salvaImpostazioni(i: Impostazioni) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(i));
  } catch {
    /* modalità privata: pazienza */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Le impostazioni correnti, aggiornate quando cambiano */
export function useImpostazioni(): Impostazioni {
  const [imp, setImp] = useState<Impostazioni>(IMPOSTAZIONI_PREDEFINITE);
  useEffect(() => {
    const aggiorna = () => setImp(leggiImpostazioni());
    aggiorna();
    window.addEventListener(EVENTO, aggiorna);
    window.addEventListener("storage", aggiorna);
    return () => {
      window.removeEventListener(EVENTO, aggiorna);
      window.removeEventListener("storage", aggiorna);
    };
  }, []);
  return imp;
}
