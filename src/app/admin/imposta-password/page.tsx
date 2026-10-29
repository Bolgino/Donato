"use client";
// Qui arriva chi apre il link della mail di invito (o di "Password dimenticata?"):
// sceglie la sua password e poi entra nell'area riservata.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

type Stato = "carico" | "pronto" | "errore" | "fatto";

function spiegaErrore(codice: string | null, descrizione: string): string {
  if (codice === "otp_expired" || /expired|invalid/i.test(descrizione))
    return "Il link è scaduto o è già stato usato. Chiedi a un admin di mandarti un nuovo invito, oppure usa «Password dimenticata?» nella pagina di accesso.";
  return descrizione;
}

const campo =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100";

export default function ImpostaPassword() {
  const [stato, setStato] = useState<Stato>("carico");
  const [messaggioErrore, setMessaggioErrore] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ripeti, setRipeti] = useState("");
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    // Errori che Supabase rimanda nel link (es. link scaduto)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const descrizione = hash.get("error_description") || query.get("error_description");
    if (descrizione) {
      setMessaggioErrore(spiegaErrore(hash.get("error_code") || query.get("error_code"), descrizione.replace(/\+/g, " ")));
      setStato("errore");
      return;
    }
    // Il client Supabase legge da solo il token nel link e apre la sessione
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setEmail(session.user.email || "");
        setStato("pronto");
        // toglie il token dalla barra degli indirizzi
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        setMessaggioErrore("Il link non è valido o è già stato usato. Chiedi a un admin di mandarti un nuovo invito, oppure usa «Password dimenticata?» nella pagina di accesso.");
        setStato("errore");
      }
    });
  }, []);

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("La password deve avere almeno 8 caratteri.");
    if (password !== ripeti) return toast.error("Le due password non sono uguali.");
    setInCorso(true);
    const { error } = await supabase.auth.updateUser({ password });
    setInCorso(false);
    if (error) return toast.error("Errore: " + error.message);
    setStato("fatto");
    toast.success("Password salvata!");
    setTimeout(() => window.location.assign("/admin"), 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-sm text-slate-800">
        <img src="/favicon.ico" alt="Donato" className="w-16 h-16 mx-auto mb-4 object-contain" />
        <h2 className="text-2xl font-extrabold text-slate-800 mb-1 text-center">Scegli la tua password</h2>

        {stato === "carico" && <p className="text-center text-slate-500 text-sm mt-6">Controllo il link…</p>}

        {stato === "errore" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-xl p-3">{messaggioErrore}</p>
            <a href="/admin" className="block text-center w-full bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700">
              Vai alla pagina di accesso
            </a>
          </div>
        )}

        {stato === "pronto" && (
          <form onSubmit={salva} className="mt-4 space-y-4">
            <p className="text-sm text-slate-600 text-center">
              Account: <b>{email}</b>
            </p>
            <label className="block">
              <span className="block text-xs font-bold text-slate-600 mb-1">Nuova password (almeno 8 caratteri)</span>
              <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={campo} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-600 mb-1">Ripeti la password</span>
              <input type="password" autoComplete="new-password" required value={ripeti} onChange={(e) => setRipeti(e.target.value)} className={campo} />
            </label>
            <button disabled={inCorso} type="submit" className="w-full bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">
              Salva e entra
            </button>
            <p className="text-[11px] text-slate-500 text-center">Da adesso entrerai con la tua email e questa password.</p>
          </form>
        )}

        {stato === "fatto" && <p className="text-center text-green-700 font-bold mt-6">✅ Password salvata. Ti porto nell&apos;area riservata…</p>}
      </div>
    </div>
  );
}
