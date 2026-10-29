"use client";
// Chi può entrare nell'area riservata: invita un nuovo admin via email, vedi chi ha accesso, togli l'accesso.
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { emailValida, fmtData } from "@/lib/donato";
import { Bottone, conferma, Istruzioni, Vuoto } from "./ui";

interface UtenteAdmin {
  id: string;
  email: string;
  invitato: string | null;
  creato: string;
  ultimoAccesso: string | null;
  io: boolean;
}

/** Chiama l'API degli admin passando il token di chi è collegato */
async function api(metodo: "GET" | "POST" | "DELETE", corpo?: object): Promise<{ ok: boolean; dati: { error?: string; utenti?: UtenteAdmin[] } }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  try {
    const r = await fetch("/api/admin/utenti", {
      method: metodo,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dati = await r.json().catch(() => ({ error: `Errore ${r.status}` }));
    return { ok: r.ok, dati };
  } catch {
    return { ok: false, dati: { error: "Connessione non riuscita. Riprova." } };
  }
}

export default function VistaAdmin() {
  const [utenti, setUtenti] = useState<UtenteAdmin[] | null>(null);
  const [erroreElenco, setErroreElenco] = useState("");
  const [email, setEmail] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [avviso, setAvviso] = useState("");

  const carica = useCallback(async () => {
    const { ok, dati } = await api("GET");
    if (ok && dati.utenti) {
      setUtenti(dati.utenti);
      setErroreElenco("");
    } else setErroreElenco(dati.error || "Non riesco a leggere l'elenco degli admin.");
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const invita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValida(email.trim())) return toast.error("Scrivi un indirizzo email valido.");
    setInCorso(true);
    setAvviso("");
    const { ok, dati } = await api("POST", { email: email.trim() });
    setInCorso(false);
    if (!ok) {
      setAvviso(dati.error || "Invito non riuscito.");
      return;
    }
    toast.success(`Invito mandato a ${email.trim()}`);
    setEmail("");
    carica();
  };

  const togli = async (u: UtenteAdmin) => {
    if (!(await conferma(`Togliere l'accesso a ${u.email}? Non potrà più entrare nell'area riservata.`, "Togli accesso"))) return;
    const { ok, dati } = await api("DELETE", { id: u.id });
    if (!ok) return toast.error(dati.error || "Non riuscito.");
    toast.success("Accesso tolto");
    carica();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Istruzioni id="admin">
        <ol className="list-decimal ml-5 space-y-1">
          <li>
            Scrivi l&apos;email della persona e tocca <b>✉️ Manda invito</b>.
          </li>
          <li>Le arriva una mail con un link: lo apre, sceglie la sua password e da lì entra con email e password.</li>
          <li>Se il link scade (dura poco), può usare «Password dimenticata?» nella pagina di accesso.</li>
        </ol>
        <p className="text-xs">
          🔒 Chi ha accesso vede tutti i dati dei ragazzi: invita solo chi gestisce il progetto, e togli l&apos;accesso a chi smette.
        </p>
      </Istruzioni>

      <form onSubmit={invita} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
        <p className="font-bold text-slate-800">Invita un nuovo admin</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@esempio.it"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-600"
          />
          <button type="submit" disabled={inCorso} className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50">
            ✉️ Manda invito
          </button>
        </div>
        {avviso && <p className="text-sm bg-orange-50 border border-orange-200 text-orange-900 rounded-xl p-3">{avviso}</p>}
      </form>

      {erroreElenco ? (
        <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-xl p-3">{erroreElenco}</p>
      ) : utenti === null ? (
        <p className="text-center text-slate-400 py-8">Caricamento…</p>
      ) : utenti.length === 0 ? (
        <Vuoto titolo="Nessun admin." />
      ) : (
        <ul className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {utenti.map((u) => (
            <li key={u.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {u.email} {u.io && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-white ml-1">tu</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {u.ultimoAccesso ? (
                    <>✅ Attivo · ultimo accesso il {fmtData(u.ultimoAccesso)}</>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      ✉️ Invitato{u.invitato ? ` il ${fmtData(u.invitato)}` : ""}: non ha ancora scelto la password
                    </span>
                  )}
                </p>
              </div>
              {!u.io && (
                <Bottone tipo="pericolo" onClick={() => togli(u)}>
                  Togli accesso
                </Bottone>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
