"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [candidature, setCandidature] = useState<any[]>([]);
  
  // Stati per Loading e Anno
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [fraseLoading, setFraseLoading] = useState("Verificando gli accessi...");
  const [annoAttivo, setAnnoAttivo] = useState<string>("Tutti");
  const [vistaAttiva, setVistaAttivo] = useState("Dashboard");

  // Stati per la modifica veloce
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editData, setEditData] = useState("");

  const frasiDivertenti = [
    "Organizzando i turni...", 
    "Svegliando i vampiri...", 
    "Smistando le candidature...", 
    "Calcolando le statistiche...", 
    "Preparando i lettini...",
    "Controllando l'emoglobina..."
  ];

  // Controllo automatico della sessione all'avvio
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Animazione frasi caricamento
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && session) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % frasiDivertenti.length;
        setFraseLoading(frasiDivertenti[i]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading, session]);

  // LOGIN UFFICIALE SUPABASE
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Errore di accesso: " + error.message);
      setIsLoggingIn(false);
    } else {
      setIsLoggingIn(false);
      fetchData();
    }
  };

  // LOGOUT UFFICIALE
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('candidature')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error("Errore Database:", error);
    } else {
      setCandidature(data || []);
      if (data && data.length > 0) {
          const anni = Array.from(new Set(data.map(c => calcolaAnnoScolastico(c.created_at)))).sort().reverse();
          if(anni.length > 0) setAnnoAttivo(anni[0]);
      }
    }
    setTimeout(() => setLoading(false), 2000); 
  };

  const salvaModifiche = async (id: string) => {
    const { error } = await supabase
      .from('candidature')
      .update({ shift_status: editStatus, note_ricontatto: editNote, data_disponibilita: editData || null })
      .eq('id', id);
    if (error) alert("Errore nel salvataggio. Controlla i permessi.");
    else { setEditingId(null); fetchData(); }
  };

  // --- LOGICA TECNICA E CALCOLI ---
  const calcolaAnnoScolastico = (dataString: string) => {
    if (!dataString) return "Sconosciuto";
    const d = new Date(dataString);
    const year = d.getFullYear();
    return d.getMonth() < 8 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
  };
  const checkIdoneita = (c: any) => {
    const eta = c.data_nascita ? Math.floor((new Date().getTime() - new Date(c.data_nascita).getTime()) / 31557600000) : 0;
    const isMinorenne = eta < 18;
    
    let isSospeso = false;
    if (c.data_ultima_donazione) {
      const dataSblocco = new Date(new Date(c.data_ultima_donazione).getTime() + 90 * 24 * 60 * 60 * 1000);
      if (dataSblocco > new Date()) isSospeso = true;
    }
    
    return { 
      abile: !isMinorenne && !isSospeso, 
      motivo: isMinorenne ? "MINORENNE" : (isSospeso ? "SOSPESO" : ""),
      color: isMinorenne || isSospeso ? "text-red-600" : "text-slate-800"
    };
  };

  const getSlotDisponibili = () => {
    const slots = [];
    let dataTest = new Date();
    dataTest.setDate(dataTest.getDate() + 5); 

    while (slots.length < 6) {
      if (dataTest.getDay() === 2 || dataTest.getDay() === 4) {
        slots.push(new Date(dataTest).toISOString().split('T')[0]);
      }
      dataTest.setDate(dataTest.getDate() + 1);
    }
    return slots;
  };
  const anniSet = new Set(candidature.map(c => calcolaAnnoScolastico(c.created_at)));
  const anniDisponibili = ["Tutti", ...Array.from(anniSet)].sort().reverse();

  const datiFiltratiAnno = annoAttivo === "Tutti" 
    ? candidature 
    : candidature.filter(c => calcolaAnnoScolastico(c.created_at) === annoAttivo);

  const daSmistare = datiFiltratiAnno.filter(c => (c.tipo_adesione === "Aspirante" || c.tipo_adesione === "Già Donatore") && c.shift_status === "Da Valutare");
  const turniConfermati = datiFiltratiAnno.filter(c => c.shift_status === "Confermato");
  const inGestione = datiFiltratiAnno.filter(c => c.shift_status === "Contattato" || c.shift_status === "Da Ricontattare");
  const pensarci = datiFiltratiAnno.filter(c => c.tipo_adesione === "Voglio pensarci");
  const archivio = datiFiltratiAnno; // Mostra tutto per l'anno selezionato
  
  let datiMostrati: any[] = [];
  if (vistaAttiva === "Da Smistare") datiMostrati = daSmistare;
  if (vistaAttiva === "Turni Confermati") datiMostrati = turniConfermati;
  if (vistaAttiva === "In Gestione") datiMostrati = inGestione;
  if (vistaAttiva === "Pensarci") datiMostrati = pensarci;
  if (vistaAttiva === "Archivio") datiMostrati = archivio;

  const totSì = daSmistare.length + inGestione.length;
  const confermati = inGestione.filter(c => c.shift_status === "Confermato").length;
  const contattati = inGestione.filter(c => c.shift_status === "Contattato").length;
  const daRicontattare = inGestione.filter(c => c.shift_status === "Da Ricontattare").length;

  const statsScuole: Record<string, number> = datiFiltratiAnno.reduce((acc: Record<string, number>, c) => {
    const scuola = c.istituto || "Non specificato";
    acc[scuola] = (acc[scuola] || 0) + 1;
    return acc;
  }, {});
  
  const scuoleOrdinate: [string, number][] = Object.entries(statsScuole).sort((a, b) => b[1] - a[1]);

  let datiMostrati: any[] = [];
  if (vistaAttiva === "Da Smistare") datiMostrati = daSmistare;
  if (vistaAttiva === "In Gestione") datiMostrati = inGestione;
  if (vistaAttiva === "Pensarci") datiMostrati = pensarci;
  if (vistaAttiva === "Archivio") datiMostrati = archivio;

  // --- SCHERMATA LOGIN SICURA ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 selection:bg-red-500">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-2xl text-center w-full max-w-sm animate-in zoom-in duration-300">
          <img src="/favicon.ico" alt="Donato" className="w-16 h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Area Riservata</h2>
          <p className="text-sm text-slate-500 mb-8">Accesso protetto per amministratori.</p>
          
          <div className="space-y-4 mb-8">
            <input 
              type="email" 
              required
              placeholder="Email Amministratore" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full border-b-2 border-slate-200 focus:border-red-600 outline-none pb-2 text-center text-sm font-medium transition-colors" 
            />
            <input 
              type="password" 
              required
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full border-b-2 border-slate-200 focus:border-red-600 outline-none pb-2 text-center text-xl tracking-widest transition-colors" 
            />
          </div>
          
          <button disabled={isLoggingIn} type="submit" className="w-full bg-red-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 hover:-translate-y-0.5 transition-all disabled:opacity-50">
            {isLoggingIn ? 'Verifica credenziali...' : 'Accedi'}
          </button>
          <div className="mt-4 text-[10px] text-slate-400 font-medium">Protetto da Supabase Auth 🔒</div>
        </form>
      </div>
    );
  }

  // --- SCHERMATA DI CARICAMENTO ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative mb-8">
          <img src="/favicon.ico" alt="Loading" className="w-24 h-24 animate-bounce object-contain z-10 relative" />
          <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-700 animate-pulse">{fraseLoading}</h2>
        <p className="text-slate-400 mt-2 text-sm">Estrazione dati protetti...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 selection:bg-red-200">
      
      {/* SIDEBAR LATERALE */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <img src="/favicon.ico" alt="Donato" className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
          <h1 className="text-xl font-bold text-white tracking-wide">Donato<span className="text-red-500">.</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">Menu Principale</p>
          
          {[
            { nome: "Dashboard", icona: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
            { nome: "Da Smistare", badge: daSmistare.length, icona: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { nome: "Turni Confermati", badge: confermati.length, icona: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { nome: "In Gestione", badge: inGestione.length, icona: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            { nome: "Pensarci", badge: pensarci.length, icona: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
            { nome: "Archivio", badge: candidature.length, icona: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" }
          ].map((item) => (
            <button key={item.nome} onClick={() => setVistaAttivo(item.nome)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${vistaAttiva === item.nome ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icona} /></svg>
                <span className="font-medium">{item.nome}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vistaAttiva === item.nome ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-center mb-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{session.user.email}</span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Disconnetti</span>
          </button>
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar con Filtri */}
        <header className="bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">{vistaAttiva}</h2>
            <p className="text-sm text-slate-500 font-medium">{datiFiltratiAnno.length} risposte visualizzate</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Filtro Anno Scolastico */}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-500 font-bold pl-2">Anno:</span>
              <select value={annoAttivo} onChange={(e) => setAnnoAttivo(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-md px-3 py-1 font-bold outline-none cursor-pointer">
                {anniDisponibili.map(anno => <option key={anno} value={anno}>{anno}</option>)}
              </select>
            </div>

            <button onClick={fetchData} className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          
          {/* VISTA DASHBOARD / STATISTICHE */}
          {vistaAttiva === "Dashboard" && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Cards Statistiche */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl">👥</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Totale Iscritti</p><p className="text-3xl font-black text-slate-800">{datiFiltratiAnno.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl">✅</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Totale "Sì"</p><p className="text-3xl font-black text-slate-800">{totSì}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-xl">🤔</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Ci Pensano</p><p className="text-3xl font-black text-slate-800">{pensarci.length}</p></div>
                </div>
              </div>

              {/* L'Albero Visivo (Funnel) */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🌳</span> Flusso Smistamento Turni</h3>
                <div className="flex flex-col items-center">
                  <div className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-md z-10 w-64 text-center border-b-4 border-slate-900">
                    Tutti i "Sì" ({totSì})
                  </div>
                  <div className="w-1 h-8 bg-slate-200"></div>
                  <div className="w-full max-w-3xl h-1 bg-slate-200 relative">
                    <div className="absolute left-0 top-0 w-1 h-4 bg-slate-200"></div>
                    <div className="absolute left-1/3 top-0 w-1 h-4 bg-slate-200"></div>
                    <div className="absolute right-1/3 top-0 w-1 h-4 bg-slate-200"></div>
                    <div className="absolute right-0 top-0 w-1 h-4 bg-slate-200"></div>
                  </div>
                  <div className="w-full max-w-4xl flex justify-between mt-4">
                    <div className="flex flex-col items-center w-1/4 px-2">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center text-xl font-black text-slate-600 mb-3 shadow-sm">{daSmistare.length}</div>
                      <span className="text-sm font-bold text-slate-700 text-center">Da Valutare</span>
                    </div>
                    <div className="flex flex-col items-center w-1/4 px-2">
                      <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center text-xl font-black text-blue-600 mb-3 shadow-sm">{contattati}</div>
                      <span className="text-sm font-bold text-blue-700 text-center">Contattati</span>
                    </div>
                    <div className="flex flex-col items-center w-1/4 px-2">
                      <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center text-xl font-black text-green-600 mb-3 shadow-sm">{confermati}</div>
                      <span className="text-sm font-bold text-green-700 text-center">Confermati</span>
                    </div>
                    <div className="flex flex-col items-center w-1/4 px-2">
                      <div className="w-16 h-16 rounded-full bg-yellow-50 border-4 border-yellow-200 flex items-center justify-center text-xl font-black text-yellow-600 mb-3 shadow-sm">{daRicontattare}</div>
                      <span className="text-sm font-bold text-yellow-700 text-center">Da Ricontattare</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabella Statistiche Rendimento Scuole */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🏫</span> Rendimento Annuale Scuole ({annoAttivo})</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-4 font-bold text-slate-600">Istituto</th>
                        <th className="p-4 font-bold text-slate-600 text-right">Adesioni Raccolte</th>
                        <th className="p-4 font-bold text-slate-600 text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {scuoleOrdinate.map(([scuola, count]) => (
                        <tr key={scuola} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-slate-800">{scuola}</td>
                          <td className="p-4 text-right font-black text-red-600 text-lg">{count}</td>
                          <td className="p-4 text-right">
                            <div className="w-full bg-slate-100 rounded-full h-2.5 ml-auto max-w-[150px]">
                              <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(Number(count) / datiFiltratiAnno.length) * 100}%` }}></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* VISTA TABELLE (Per le altre sezioni) */}
          {vistaAttiva !== "Dashboard" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              {datiMostrati.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-lg font-bold text-slate-700">Tutto pulito!</h3>
                  <p className="text-slate-500">Non ci sono ragazzi in questa lista per l'anno {annoAttivo}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4 font-bold pl-6">Data & Profilo</th>
                        <th className="p-4 font-bold">Contatti</th>
                        <th className="p-4 font-bold">Scuola & Medica</th>
                        {vistaAttiva !== "Archivio" && <th className="p-4 font-bold">Stato Turno</th>}
                        <th className="p-4 font-bold pr-6 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {datiMostrati.map((c) => {
                        
                        // LOGICA TECNICA CALCOLI
                        const eta = c.data_nascita ? Math.floor((new Date().getTime() - new Date(c.data_nascita).getTime()) / 31557600000) : null;
                        
                        let statoIdoneita = null;
                        if (c.data_ultima_donazione) {
                          const dataUltima = new Date(c.data_ultima_donazione);
                          const dataSblocco = new Date(dataUltima.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 giorni
                          if (dataSblocco > new Date()) {
                            statoIdoneita = { ok: false, data: dataSblocco.toLocaleDateString('it-IT') };
                          } else {
                            statoIdoneita = { ok: true, data: null };
                          }
                        }

                        return (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                            
                            {/* Colonna Profilo */}
                            <td className="p-4 pl-6 align-top">
                              <div className="text-xs text-slate-400 font-medium mb-1">{new Date(c.created_at).toLocaleDateString('it-IT')}</div>
                              <div className={`font-extrabold text-base flex items-center ${checkIdoneita(c).color}`}>
                                {c.nome} {c.cognome}
                                {!checkIdoneita(c).abile && (
                                  <span className="ml-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                                    {checkIdoneita(c).motivo}
                                  </span>
                                )}
                              </div>
                              <div className={`text-[10px] uppercase font-bold tracking-wider inline-block px-2 py-0.5 rounded mt-1 ${
                                c.tipo_adesione === 'Aspirante' ? 'bg-indigo-100 text-indigo-700' :
                                c.tipo_adesione === 'Già Donatore' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {c.tipo_adesione}
                              </div>
                            </td>

                            {/* Colonna Contatti */}
                            <td className="p-4 align-top">
                              <div className="flex items-center space-x-2 text-slate-600 mb-1">
                                <span className="text-base">📱</span> <span className="font-medium">{c.cellulare}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-slate-600 text-xs">
                                <span className="text-base">✉️</span> <span>{c.email}</span>
                              </div>
                            </td>

                            {/* Colonna Scuola e Logica Medica */}
                            <td className="p-4 align-top">
                              <div className="font-semibold text-slate-700">{c.istituto}</div>
                              <div className="text-slate-500 text-xs mb-2">Classe: {c.classe || '-'}</div>
                              
                              <div className="space-y-1">
                                {c.ha_fatto_ecg !== null && (
                                  <div className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 inline-block px-2 py-0.5 rounded mr-1">
                                    ECG: <span className="font-bold">{c.ha_fatto_ecg ? "Sì" : "No"}</span>
                                  </div>
                                )}
                                
                                {statoIdoneita && (
                                  <div className={`text-[10px] inline-block px-2 py-0.5 rounded border font-medium mt-1 ${statoIdoneita.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                    {statoIdoneita.ok ? '✔️ Idoneo a donare' : `⏳ Sospeso fino al ${statoIdoneita.data}`}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Colonna Stato Turno */}
                            {vistaAttiva !== "Archivio" && (
                              <td className="p-4 align-top relative">
                                {editingId === c.id ? (
                                  <div className="space-y-3 w-[280px] bg-white p-4 rounded-xl shadow-2xl border-2 border-red-500 absolute z-50 left-0 top-0">
                                    {checkIdoneita(c).abile ? (
                                      <>
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">1. Scegli Slot Martedì/Giovedì</label>
                                          <select 
                                            value={editData} 
                                            onChange={(e) => {setEditData(e.target.value); setEditStatus("Confermato");}}
                                            className="w-full border-b border-slate-200 py-1 text-sm outline-none font-bold"
                                          >
                                            <option value="">Seleziona una data...</option>
                                            {getSlotDisponibili().map(date => (
                                              <option key={date} value={date}>
                                                {new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">2. Oppure cambia stato</label>
                                          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full border-b border-slate-200 py-1 text-sm outline-none">
                                            <option value="Da Valutare">Da Valutare</option>
                                            <option value="Contattato">Contattato</option>
                                            <option value="Da Ricontattare">Da Ricontattare</option>
                                          </select>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                        <p className="text-red-700 text-xs font-bold uppercase text-center">🚫 Azione Bloccata</p>
                                        <p className="text-[10px] text-red-500 text-center mt-1">Impossibile inserire {checkIdoneita(c).motivo} nei turni.</p>
                                      </div>
                                    )}
                                    
                                    <div className="flex space-x-2 pt-2">
                                      <button onClick={() => salvaModifiche(c.id)} disabled={!checkIdoneita(c).abile && editStatus === "Confermato"} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-black shadow-lg disabled:opacity-30">CONFERMA</button>
                                      <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-400 py-2 rounded-lg text-xs font-bold">CHIUDI</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className={`px-2.5 py-1 rounded-md font-bold text-xs border ${
                                      c.shift_status === 'Confermato' ? 'bg-green-50 text-green-700 border-green-200' :
                                      c.shift_status === 'Contattato' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      c.shift_status === 'Da Ricontattare' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                      'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                      {c.shift_status === 'Da Valutare' ? '⏳ Da Valutare' : 
                                       c.shift_status === 'Confermato' ? '✅ Confermato' : 
                                       c.shift_status === 'Contattato' ? '📞 Contattato' : 
                                       '🔄 Da Ricontattare'}
                                    </span>
                                    
                                    {c.shift_status === 'Da Ricontattare' && c.data_disponibilita && (
                                      <div className="text-xs text-red-600 mt-2 font-bold flex items-center">
                                        Riprovare dal: {new Date(c.data_disponibilita).toLocaleDateString('it-IT')}
                                      </div>
                                    )}
                                    {c.shift_status === 'Da Ricontattare' && c.note_ricontatto && (
                                      <div className="text-[11px] text-slate-600 mt-1 leading-tight italic bg-yellow-50 p-1.5 rounded border border-yellow-100">
                                        "{c.note_ricontatto}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Colonna Azioni */}
                            <td className="p-4 pr-6 text-right align-top">
                              <div className="flex justify-end space-x-2 flex-wrap gap-y-2">
                                
                                {/* Pulsante Modifica */}
                                {vistaAttiva !== "Archivio" && vistaAttiva !== "Pensarci" && editingId !== c.id && (
                                  <button onClick={() => {
                                    setEditingId(c.id);
                                    setEditStatus(c.shift_status);
                                    setEditNote(c.note_ricontatto || "");
                                    setEditData(c.data_disponibilita || "");
                                  }} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:border-red-300 hover:text-red-600 transition-colors">
                                    Gestisci Turno
                                  </button>
                                )}
                                {vistaAttiva === "Turni Confermati" && (
                                    <div className="space-y-8">
                                      {Object.entries(
                                        datiMostrati.reduce((acc: any, c) => {
                                          const data = c.data_disponibilita || "Data non impostata";
                                          if (!acc[data]) acc[data] = [];
                                          acc[data].push(c);
                                          return acc;
                                        }, {})
                                      ).sort().map(([data, persone]: [any, any]) => (
                                        <div key={data} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800">
                                              {data !== "Data non impostata" ? new Date(data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : data}
                                            </h3>
                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                                              {persone.length} PRONTI
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                                            {persone.map((p: any) => (
                                              <div key={p.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                                <p className="font-bold text-slate-900">{p.nome} {p.cognome}</p>
                                                <p className="text-xs text-slate-500">{p.istituto}</p>
                                                <p className="text-[10px] font-mono mt-2 text-blue-600">{p.cellulare}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                {/* Pulsante Mail per Pensarci */}
                                {vistaAttiva === "Pensarci" && (
                                  <td className="p-4 align-top">
                                    {(() => {
                                      const dataRisposta = new Date(c.created_at);
                                      const oggi = new Date();
                                      const diffMesi = (oggi.getFullYear() - dataRisposta.getFullYear()) * 12 + (oggi.getMonth() - dataRisposta.getMonth());
                                      return diffMesi >= 1 ? (
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded animate-pulse">
                                          ⚠️ RICONTATTARE (1 MESE+)
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">Attesa riflessione...</span>
                                      );
                                    })()}
                                  </td>
                                )}
                                
                                {/* Lettura Note per No e Pensarci */}
                                {(vistaAttiva === "Pensarci" || vistaAttiva === "Archivio") && c.motivo_scelta && (
                                  <div className="relative group/tooltip inline-block">
                                    <button className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-200 cursor-help">
                                      Leggi Motivo
                                    </button>
                                    <div className="absolute hidden group-hover/tooltip:block z-50 right-0 mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl text-left whitespace-normal leading-relaxed before:content-[''] before:absolute before:top-[-6px] before:right-6 before:border-b-8 before:border-b-slate-800 before:border-x-8 before:border-x-transparent">
                                      {c.motivo_scelta}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

