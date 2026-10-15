"use client";
// Area riservata: login, caricamento dati e scelta della pagina.
// La logica (chi va dove, turni, idoneità) è in src/lib/donato.ts,
// le singole pagine sono in src/components/admin/Vista*.tsx.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Candidato, Professore } from "@/types/admin";
import { annoScolasticoDi, calcolaAnnoScolastico, faseDi, leggiPreferenza, leggiSpunte, oggiISO, raggruppaTurni, scriviPreferenza, scriviSpunte, SpuntaTurno } from "@/lib/donato";
import Sidebar, { VOCI_MENU } from "@/components/admin/Sidebar";
import SchedaPersona from "@/components/admin/SchedaPersona";
import VistaOggi, { calcolaCompiti } from "@/components/admin/VistaOggi";
import VistaDaContattare, { inPausa } from "@/components/admin/VistaDaContattare";
import VistaTurni from "@/components/admin/VistaTurni";
import VistaCiPensano from "@/components/admin/VistaCiPensano";
import VistaArchivio from "@/components/admin/VistaArchivio";
import VistaRubrica from "@/components/admin/VistaRubrica";
import VistaStatistiche from "@/components/admin/VistaStatistiche";
import VistaGuida from "@/components/admin/VistaGuida";
import VistaDomande from "@/components/admin/VistaDomande";
import { Azioni, Vista } from "@/components/admin/tipi";

const CON_RICERCA: Vista[] = ["contattare", "turni", "pensano", "archivio", "rubrica", "domande"];
const CON_ANNO: Vista[] = ["archivio", "statistiche"];

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [candidature, setCandidature] = useState<Candidato[]>([]);
  const [professori, setProfessori] = useState<Professore[]>([]);
  const [caricato, setCaricato] = useState(false);

  const [vista, setVista] = useState<Vista>("oggi");
  const [annoAttivo, setAnnoAttivo] = useState<string>("Tutti");
  const [ricerca, setRicerca] = useState("");
  const [schedaId, setSchedaId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [spunte, setSpunte] = useState<Record<string, SpuntaTurno>>({});
  // "Ho chiesto ai prof se partecipano" per l'anno scolastico in corso (salvato su questo dispositivo)
  const annoCorrente = annoScolasticoDi(oggiISO());
  const [profInvitati, setProfInvitatiStato] = useState(false);
  const contenutoRef = useRef<HTMLDivElement>(null);

  // Cambiando pagina si riparte dall'alto
  useEffect(() => {
    contenutoRef.current?.scrollTo?.(0, 0);
  }, [vista]);

  // ---------------- dati ----------------
  const fetchData = useCallback(async (silenzioso = false) => {
    const idToast = silenzioso ? undefined : toast.loading("Aggiornamento…", { id: "refresh" });
    const [candRes, profRes] = await Promise.all([
      supabase.from("candidature").select("*").order("created_at", { ascending: true }),
      supabase.from("professori").select("*").order("scuola", { ascending: true }),
    ]);
    if (!candRes.error) setCandidature((candRes.data as Candidato[]) || []);
    else toast.error("Errore nel caricare le risposte: " + candRes.error.message);
    if (!profRes.error) setProfessori((profRes.data as Professore[]) || []);
    setCaricato(true);
    if (idToast) {
      if (candRes.error) toast.dismiss(idToast);
      else toast.success("Dati aggiornati", { id: idToast });
    }
  }, []);

  useEffect(() => {
    setSpunte(leggiSpunte());
    setProfInvitatiStato(leggiPreferenza("prof-invitati-" + annoScolasticoDi(oggiISO()), false));
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const toastId = toast.loading("Accesso in corso...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoggingIn(false);
    if (error) toast.error("Errore: " + error.message, { id: toastId });
    else {
      toast.success("Accesso effettuato!", { id: toastId });
      setPassword("");
      fetchData(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ---------------- operazioni ----------------
  const azioni = useMemo<Azioni>(
    () => ({
      aggiorna: async (id, payload, msgOk = "Salvato") => {
        const t = toast.loading("Salvataggio…");
        const { error } = await supabase.from("candidature").update(payload).eq("id", id);
        if (error) {
          toast.error("Errore: " + error.message, { id: t });
          return false;
        }
        setCandidature((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload } : c)));
        toast.success(msgOk, { id: t });
        fetchData(true);
        return true;
      },
      aggiornaMolti: async (ids, payload, msgOk = "Salvato") => {
        if (ids.length === 0) return true;
        const t = toast.loading("Salvataggio…");
        const { error } = await supabase.from("candidature").update(payload).in("id", ids);
        if (error) {
          toast.error("Errore: " + error.message, { id: t });
          return false;
        }
        const set = new Set(ids);
        setCandidature((prev) => prev.map((c) => (set.has(c.id) ? { ...c, ...payload } : c)));
        toast.success(msgOk, { id: t, duration: 6000 });
        fetchData(true);
        return true;
      },
      elimina: async (id) => {
        const t = toast.loading("Eliminazione in corso…");
        const { error } = await supabase.from("candidature").delete().eq("id", id);
        if (error) {
          toast.error("Errore di eliminazione: " + error.message, { id: t });
          return false;
        }
        setCandidature((prev) => prev.filter((c) => c.id !== id));
        toast.success("Eliminato definitivamente", { id: t });
        return true;
      },
      apriScheda: (id) => setSchedaId(id),
      vaiA: (v) => {
        setVista(v);
        setSchedaId(null);
        setRicerca("");
      },
    }),
    [fetchData],
  );

  const salvaProf = async (p: Partial<Professore>) => {
    const t = toast.loading("Salvataggio professore…");
    const { error } = p.id ? await supabase.from("professori").update(p).eq("id", p.id) : await supabase.from("professori").insert([p]);
    if (error) {
      toast.error(error.message, { id: t });
      return false;
    }
    toast.success(p.id ? "Aggiornato!" : "Aggiunto!", { id: t });
    fetchData(true);
    return true;
  };

  const eliminaProf = async (id: string) => {
    const { error } = await supabase.from("professori").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Professore rimosso");
    setProfessori((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  const setProfInvitati = (v: boolean) => {
    setProfInvitatiStato(v);
    scriviPreferenza("prof-invitati-" + annoCorrente, v);
  };

  const setSpunta = (data: string, s: SpuntaTurno) => {
    const nuove = { ...spunte, [data]: s };
    setSpunte(nuove);
    scriviSpunte(nuove);
  };

  // ---------------- liste ----------------
  const daContattare = useMemo(() => candidature.filter((c) => ["da_contattare", "da_ricontattare"].includes(faseDi(c))), [candidature]);
  const pensano = useMemo(() => candidature.filter((c) => faseDi(c) === "ci_pensa"), [candidature]);
  const turni = useMemo(() => raggruppaTurni(candidature), [candidature]);
  const anniDisponibili = useMemo(
    () => ["Tutti", ...Array.from(new Set(candidature.map((c) => calcolaAnnoScolastico(c.created_at)))).sort().reverse()],
    [candidature],
  );
  const datiAnno = annoAttivo === "Tutti" ? candidature : candidature.filter((c) => calcolaAnnoScolastico(c.created_at) === annoAttivo);
  const compiti = calcolaCompiti(daContattare, turni, pensano, spunte, profInvitati);
  const scheda = schedaId ? candidature.find((c) => c.id === schedaId) : undefined;

  const conteggi: Partial<Record<Vista, number>> = {
    oggi: compiti.length,
    contattare: daContattare.filter((c) => !inPausa(c)).length,
    turni: turni.filter((t) => !t.passato).length,
    pensano: pensano.length,
    archivio: candidature.length,
  };

  // ---------------- login ----------------
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl text-center w-full max-w-sm">
          <img src="/favicon.ico" alt="Donato" className="w-16 h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Area Riservata</h2>
          <div className="space-y-4 mb-8">
            <input type="email" required placeholder="Email Amministratore" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-b-2 border-slate-200 focus:border-red-600 outline-none pb-2 text-center text-sm font-bold bg-transparent" />
            <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-b-2 border-slate-200 focus:border-red-600 outline-none pb-2 text-center text-xl tracking-widest bg-transparent" />
          </div>
          <button disabled={isLoggingIn} type="submit" className="w-full bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50">
            Accedi
          </button>
        </form>
      </div>
    );
  }

  const voce = VOCI_MENU.find((v) => v.id === vista) ?? VOCI_MENU[0];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 selection:bg-red-200">
      <Sidebar
        vistaAttiva={vista}
        setVistaAttiva={azioni.vaiA}
        emailAmministratore={session.user.email || ""}
        handleLogout={handleLogout}
        isMobileOpen={isSidebarOpen}
        setIsMobileOpen={setIsSidebarOpen}
        conteggi={conteggi}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 z-10 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-slate-100 p-2 rounded-lg text-slate-600 border border-slate-200" aria-label="Apri menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-2xl font-extrabold text-slate-800 truncate">
                <span aria-hidden>{voce.icona}</span> {voce.nome}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 truncate">{voce.descrizione}</p>
            </div>
            <button onClick={() => fetchData()} className="flex items-center gap-2 bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-slate-200 shrink-0" title="Ricarica i dati">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden md:inline">Aggiorna</span>
            </button>
          </div>

          {(CON_RICERCA.includes(vista) || CON_ANNO.includes(vista)) && (
            <div className="flex flex-col sm:flex-row gap-2">
              {CON_RICERCA.includes(vista) && (
                <input
                  type="search"
                  value={ricerca}
                  onChange={(e) => setRicerca(e.target.value)}
                  placeholder="🔍 Cerca per nome, scuola, classe…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
                />
              )}
              {CON_ANNO.includes(vista) && (
                <select value={annoAttivo} onChange={(e) => setAnnoAttivo(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 font-bold outline-none cursor-pointer">
                  {anniDisponibili.map((anno) => (
                    <option key={anno} value={anno}>
                      {anno === "Tutti" ? "Tutti gli anni" : `Anno ${anno}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </header>

        <div ref={contenutoRef} className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50">
          {!caricato ? (
            <p className="text-center text-slate-400 py-20">Caricamento…</p>
          ) : (
            <>
              {vista === "oggi" && <VistaOggi daContattare={daContattare} turni={turni} pensano={pensano} spunte={spunte} profInvitati={profInvitati} azioni={azioni} />}
              {vista === "contattare" && <VistaDaContattare lista={daContattare} tutti={candidature} azioni={azioni} ricerca={ricerca} />}
              {vista === "turni" && <VistaTurni turni={turni} profs={professori} azioni={azioni} ricerca={ricerca} spunte={spunte} setSpunta={setSpunta} />}
              {vista === "pensano" && <VistaCiPensano lista={pensano} azioni={azioni} ricerca={ricerca} />}
              {vista === "rubrica" && <VistaRubrica profs={professori} ricerca={ricerca} salva={salvaProf} elimina={eliminaProf} anno={annoCorrente} invitati={profInvitati} setInvitati={setProfInvitati} />}
              {vista === "archivio" && <VistaArchivio lista={datiAnno} annoAttivo={annoAttivo} azioni={azioni} ricerca={ricerca} />}
              {vista === "statistiche" && <VistaStatistiche dati={datiAnno} candidature={candidature} annoAttivo={annoAttivo} />}
              {vista === "domande" && <VistaDomande ricerca={ricerca} />}
              {vista === "guida" && <VistaGuida vaiA={azioni.vaiA} />}
            </>
          )}
        </div>
      </main>

      {scheda && <SchedaPersona key={scheda.id} c={scheda} tutti={candidature} azioni={azioni} onClose={() => setSchedaId(null)} />}
    </div>
  );
}
