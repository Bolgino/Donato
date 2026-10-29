// Link che arrivano dalle mail di Supabase (invito, "Password dimenticata?", link scaduto).
// Supabase mette i dati dopo il "#": se li troviamo, la persona deve andare a scegliere la password.
export const PAGINA_PASSWORD = "/admin/imposta-password";

// Letto subito all'avvio: il client di Supabase, dopo aver usato il token, pulisce il "#" dall'indirizzo
const HASH_INIZIALE = typeof window !== "undefined" ? window.location.hash : "";

export function linkDaEmail(hash: string): boolean {
  return /type=(invite|recovery|signup|magiclink)|error_code=|error_description=/.test(hash);
}

/** Se la pagina è stata aperta da un link delle mail, porta a "Scegli la tua password". Ritorna true se reindirizza. */
export function vaiAImpostaPasswordSeServe(): boolean {
  if (typeof window === "undefined" || window.location.pathname === PAGINA_PASSWORD) return false;
  const hash = linkDaEmail(window.location.hash) ? window.location.hash : linkDaEmail(HASH_INIZIALE) ? HASH_INIZIALE : "";
  if (!hash) return false;
  window.location.replace(PAGINA_PASSWORD + hash);
  return true;
}
