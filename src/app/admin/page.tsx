"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Candidato } from "@/types/admin";
import Sidebar from "@/components/admin/Sidebar";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  
  // Usiamo finalmente il tipo corretto invece di any
  const [candidature, setCandidature] = useState<Candidato[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [annoAttivo, setAnnoAttivo] = useState<string>("Tutti");
  const [vistaAttiva, setVistaAttivo] = useState("Dashboard");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<any>("");
  const [editNote, setEditNote] = useState("");
  const [editData, setEditData] = useState("");
  const [expandedTurno, setExpandedTurno] = useState<string | null>(null);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const toastId = toast.loading("Accesso in corso...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) { 
      toast.error("Errore di accesso: " + error.message, { id: toastId }); 
      setIsLoggingIn(false); 
    } else { 
      toast.success("Accesso effettuato!", { id: toastId });
      setIsLoggingIn(false); 
      fetchData(); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('candidature').select('*').order('created_at', { ascending: true });
    if (!error) {
      setCandidature(data || []);
      if (data && data.length > 0) {
          const anni = Array.from(new Set(data.map(c => calcolaAnnoScolastico(c.created_at)))).sort().reverse();
          if(anni.length > 0 && annoAttivo === "Tutti") setAnnoAttivo(anni[0]);
      }
    } else {
      toast.error("Errore nel recupero dati");
    }
    setLoading(false);
  };

  const salvaModificheTurno = async (id: string) => {
    const salvataggio = toast.loading("Salvataggio in corso...");
    const { error } = await supabase
      .from('candidature')
      .update({ shift_status: editStatus, note_ricontatto: editNote, data_disponibilita: editData || null })
      .eq('id', id);
      
    if (!error) { 
      toast.success("Turno aggiornato", { id: salvataggio });
      setEditingId(null); 
      fetchData(); 
    } else {
      toast.error("Errore: " + error.message, { id: salvataggio });
    }
  };

  const impostaDaPensarci = async (id: string, scelta: 'SI' | 'NO') => {
    const tipo = scelta === 'SI' ? 'Aspirante' : 'NO';
    const status = 'Da Valutare';
    const note = scelta === 'NO' ? 'Non interessato.' : 'Ha accettato dopo averci pensato.';
    
    const { error } = await supabase.from('candidature').update({ tipo_adesione: tipo, shift_status: status, note_ricontatto: note }).eq('id', id);
    if (!error) { 
      toast.success("Scelta registrata!");
      setEditingId(null); 
      fetchData(); 
    }
  };

  const rimuoviDaTurno = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">Rimuovere dal turno?</p>
        <div className="flex gap-2">
          <button onClick={async () => {
            toast.dismiss(t.id);
            const { error } = await supabase.from('candidature').update({ shift_status: 'Da Ricontattare', data_disponibilita: null, note_ricontatto: "Rimosso dal turno." }).eq('id', id);
            if (!error) { toast.success("Rimosso con successo"); fetchData(); }
          }} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">Sì, rimuovi</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 px-3 py-1 rounded text-xs font-bold">Annulla</button>
        </div>
      </div>
    ));
  };

  // FUNZIONE ELIMINA AGGIORNATA
  const eliminaCandidato = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800 text-sm">Vuoi eliminare definitivamente questa persona?</p>
        <p className="text-xs text-red-600 font-medium">Azione irreversibile. Verrà cancellata dal database.</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
            toast.dismiss(t.id);
            const loadToast = toast.loading("Eliminazione in corso...");
            
            // 1. Aggiornamento ottimistico: rimuove dalla UI subito
            setCandidature(prev => prev.filter(c => c.id !== id));
            
            // 2. Cancellazione da DB
            const { error } = await supabase.from('candidature').delete().eq('id', id);
            
            if (!error) { 
              toast.success("Candidato eliminato definitivamente!", { id: loadToast });
            } else { 
              // Se fallisce (es. RLS Error), rimette l'utente nella UI e mostra l'errore
              fetchData();
              toast.error("Errore. Controlla le Policy Supabase (RLS): " + error.message, { id: loadToast });
            }
          }} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md">Elimina Ora</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200">Annulla</button>
        </div>
      </div>
    ), { duration: 6000 });
  };

  // --- LOGICA E CALCOLI ---
  const calcolaAnnoScolastico = (dataString: string) => {
    if (!dataString) return "Sconosciuto";
    const d = new Date(dataString);
    const year = d.getFullYear();
    return d.getMonth() < 8 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
  };

  const checkIdoneita = (c: Candidato) => {
    const eta = c.data_nascita ? Math.floor((new Date().getTime() - new Date(c.data_nascita).getTime()) / 31557600000) : 0;
    const isMinorenne = eta < 18;
    let isSospeso = false;
    if (c.data_ultima_donazione) {
      const dataSblocco = new Date(new Date(c.data_ultima_donazione).getTime() + 90 * 24 * 60 * 60 * 1000);
      if (dataSblocco > new Date()) isSospeso = true;
    }
    return { abile: !isMinorenne && !isSospeso, motivo: isMinorenne ? "MINORENNE" : (isSospeso ? "SOSPESO" : ""), color: isMinorenne || isSospeso ? "text-red-600" : "text-slate-800" };
  };

  // --- FILTRI ---
  const anniSet = new Set(candidature.map(c => calcolaAnnoScolastico(c.created_at)));
  const anniDisponibili = ["Tutti", ...Array.from(anniSet)].sort().reverse();
  const datiFiltratiAnno = annoAttivo === "Tutti" ? candidature : candidature.filter(c => calcolaAnnoScolastico(c.created_at) === annoAttivo);

  const daSmistare = datiFiltratiAnno.filter(c => 
    (c.tipo_adesione === "Aspirante" || c.tipo_adesione === "Già Donatore" || c.tipo_adesione === "SÌ" || c.tipo_adesione === "SI") && 
    (c.shift_status === "Da Valutare" || c.shift_status === "Da Ricontattare")
  ).sort((a, b) => {
    if (a.shift_status === "Da Valutare" && b.shift_status === "Da Ricontattare") return -1;
    if (a.shift_status === "Da Ricontattare" && b.shift_status === "Da Valutare") return 1;
    return 0;
  });

  const pending = datiFiltratiAnno.filter(c => 
    (c.tipo_adesione === "Aspirante" || c.tipo_adesione === "Già Donatore" || c.tipo_adesione === "SÌ" || c.tipo_adesione === "SI") && 
    c.shift_status === "Contattato"
  ).sort((a, b) => new Date(a.data_disponibilita || "").getTime() - new Date(b.data_disponibilita || "").getTime());

  const turniConfermati = datiFiltratiAnno.filter(c => c.shift_status === "Confermato").sort((a, b) => new Date(b.data_disponibilita || "").getTime() - new Date(a.data_disponibilita || "").getTime());

  const pensarci = datiFiltratiAnno.filter(c => c.tipo_adesione === "Voglio pensarci");
  const archivio = datiFiltratiAnno; 

  let datiMostrati: Candidato[] = [];
  if (vistaAttiva === "Da Smistare") datiMostrati = daSmistare;
  if (vistaAttiva === "Pending") datiMostrati = pending;
  if (vistaAttiva === "Ci voglio pensare") datiMostrati = pensarci;
  if (vistaAttiva === "Archivio") datiMostrati = archivio;

  const getSlotDisponibili = () => {
    const occupatiPerData = datiFiltratiAnno.reduce((acc: Record<string, number>, c) => {
      if ((c.shift_status === 'Contattato' || c.shift_status === 'Confermato') && c.data_disponibilita) {
        acc[c.data_disponibilita] = (acc[c.data_disponibilita] || 0) + 1;
      }
      return acc;
    }, {});
    const slots = [];
    let dataTest = new Date();
    dataTest.setDate(dataTest.getDate() + 5); 
    while (slots.length < 6) {
      if (dataTest.getDay() === 2 || dataTest.getDay() === 4) {
        const dateString = dataTest.toISOString().split('T')[0];
        const occupati = occupatiPerData[dateString] || 0;
        if (occupati < 4) slots.push({ date: dateString, occupati });
      }
      dataTest.setDate(dataTest.getDate() + 1);
    }
    return slots;
  };

  const statsScuole = datiFiltratiAnno.reduce((acc: Record<string, number>, c) => {
    const scuola = c.istituto || "Non specificato";
    acc[scuola] = (acc[scuola] || 0) + 1;
    return acc;
  }, {});
  const scuoleOrdinate = Object.entries(statsScuole).sort((a, b) => b[1] - a[1]);

  // --- RENDER LOGIN / LOADING ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 selection:bg-red-500">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-2xl text-center w-full max-w-sm animate-in zoom-in duration-300">
          <img src="/favicon.ico" alt="Donato" className="w-16 h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Area Riservata</h2>
          <div className="space-y-4 mb-8">
            <input type="email" required placeholder="Email Amministratore" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-b-2 border-slate-200 focus:border-red-600 outline-none pb-2 text-center text-sm font-bold bg-transparent" />
            <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-b-2 border-slate-200 focus:border-red-600 outline-none pb-2 text-center text-xl tracking-widest bg-transparent" />
          </div>
          <button disabled={isLoggingIn} type="submit" className="w-full bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50">Accedi</button>
        </form>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 selection:bg-red-200">
      
      {/* Componente Sidebar Isolato */}
      <Sidebar 
        vistaAttiva={vistaAttiva} 
        setVistaAttivo={setVistaAttivo} 
        emailAmministratore={session.user.email} 
        handleLogout={handleLogout}
        conteggi={{
          daSmistare: daSmistare.length,
          pending: pending.length,
          confermati: turniConfermati.length,
          pensarci: pensarci.length,
          archivio: candidature.length
        }}
      />

      {/* CONTENUTO PRINCIPALE */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">{vistaAttiva}</h2>
            <p className="text-sm text-slate-500 font-medium">{vistaAttiva === "Turni Confermati" ? turniConfermati.length : datiMostrati.length} risposte</p>
          </div>
          <div className="flex items-center space-x-4">
            <select value={annoAttivo} onChange={(e) => setAnnoAttivo(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 font-bold outline-none cursor-pointer shadow-sm">
              {anniDisponibili.map(anno => <option key={anno} value={anno}>{anno}</option>)}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          
          {/* DASHBOARD COMPONENT (Per brevità inline, ma tipizzato) */}
          {vistaAttiva === "Dashboard" && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl">👥</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Totale Iscritti</p><p className="text-3xl font-black text-slate-800">{datiFiltratiAnno.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl">✅</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Pronti e Assegnati</p><p className="text-3xl font-black text-slate-800">{turniConfermati.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-xl">⏳</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Da Gestire / Pending</p><p className="text-3xl font-black text-slate-800">{daSmistare.length + pending.length}</p></div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🏫</span> Rendimento Annuale Scuole ({annoAttivo})</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr><th className="p-4 font-bold text-slate-600">Istituto</th><th className="p-4 font-bold text-slate-600 text-right">Adesioni Raccolte</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {scuoleOrdinate.map(([scuola, count]) => (
                        <tr key={scuola} className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-800">{scuola}</td><td className="p-4 text-right font-black text-red-600 text-lg">{count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TURNI CONFERMATI */}
          {vistaAttiva === "Turni Confermati" && (
            <div className="space-y-4 animate-in fade-in max-w-6xl mx-auto">
              {Object.entries(
                turniConfermati.reduce((acc: any, c) => {
                  const data = c.data_disponibilita || "Data non impostata";
                  if (!acc[data]) acc[data] = [];
                  acc[data].push(c);
                  return acc;
                }, {})
              ).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([data, persone]: [any, Candidato[]]) => (
                <div key={data} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div onClick={() => setExpandedTurno(expandedTurno === data ? null : data)} className="bg-slate-50 px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{expandedTurno === data ? '📂' : '📅'}</span>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{data !== "Data non impostata" ? new Date(data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : data}</h3>
                        <p className="text-xs text-slate-500 font-medium">{data !== "Data non impostata" ? 'Ospedale di Feltre - Centro Trasfusionale' : 'Da organizzare'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full border border-green-200 shadow-sm">{persone.length} / 4 PRONTI</span>
                      <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedTurno === data ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  
                  {expandedTurno === data && (
                    <div className="p-6 bg-white border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {persone.map((p) => (
                          <div key={p.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative group hover:shadow-md transition-shadow">
                            <p className="font-black text-slate-800 text-lg leading-tight">{p.nome} {p.cognome}</p>
                            <p className="text-xs text-slate-500 mb-1 mt-1"><strong>Nato:</strong> {p.data_nascita ? new Date(p.data_nascita).toLocaleDateString('it-IT') : 'N/D'}</p>
                            <div className="flex items-center mb-2">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.ha_fatto_ecg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>ECG: {p.ha_fatto_ecg ? "Sì" : "No"}</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">{p.istituto}</p>
                            <div className="flex items-center text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit mb-4">📱 {p.cellulare}</div>
                            <button onClick={(e) => { e.stopPropagation(); rimuoviDaTurno(p.id); }} className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200">Rimuovi</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TABELLE: Da Smistare, Pending, Ci Voglio Pensare, Archivio */}
          {["Da Smistare", "Pending", "Ci voglio pensare", "Archivio"].includes(vistaAttiva) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="overflow-x-auto min-h-[500px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4 font-bold pl-6">Data & Profilo</th>
                      <th className="p-4 font-bold">Contatti</th>
                      <th className="p-4 font-bold">Scuola & Medica</th>
                      {(vistaAttiva === "Da Smistare" || vistaAttiva === "Pending") && <th className="p-4 font-bold">Stato Turno</th>}
                      {vistaAttiva !== "Archivio" ? <th className="p-4 font-bold pr-6 text-right">Azioni</th> : <th className="p-4 font-bold pr-6 text-right text-red-500">Zona Pericolo</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {datiMostrati.map((c) => {
                      const statoIdoneita = checkIdoneita(c);
                      return (
                        <tr key={c.id} className={`group ${c.shift_status === 'Da Ricontattare' ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                          
                          <td className="p-4 pl-6 align-top">
                            <div className="text-xs text-slate-400 font-medium mb-1">{new Date(c.created_at).toLocaleDateString('it-IT')}</div>
                            <div className={`font-extrabold text-base flex items-center ${statoIdoneita.color}`}>
                              {c.nome} {c.cognome}
                              {!statoIdoneita.abile && <span className="ml-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{statoIdoneita.motivo}</span>}
                            </div>
                            <div className="text-[10px] uppercase font-bold tracking-wider inline-block px-2 py-0.5 rounded mt-1 bg-slate-100 text-slate-600">{c.tipo_adesione}</div>
                          </td>

                          <td className="p-4 align-top">
                            <div className="flex items-center space-x-2 text-slate-600 mb-1"><span className="text-base">📱</span> <span className="font-medium">{c.cellulare}</span></div>
                            <div className="flex items-center space-x-2 text-slate-600 text-xs"><span className="text-base">✉️</span> <span>{c.email}</span></div>
                          </td>

                          <td className="p-4 align-top">
                            <div className="font-semibold text-slate-700">{c.istituto}</div>
                            {c.ha_fatto_ecg !== null && <div className="text-[10px] mt-1 bg-slate-100 border border-slate-200 text-slate-600 inline-block px-2 py-0.5 rounded">ECG: <span className="font-bold">{c.ha_fatto_ecg ? "Sì" : "No"}</span></div>}
                          </td>

                          {(vistaAttiva === "Da Smistare" || vistaAttiva === "Pending") && (
                            <td className="p-4 align-top relative">
                              {editingId === c.id ? (
                                <div className="space-y-3 w-[280px] bg-white p-4 rounded-xl shadow-2xl border-2 border-red-500 absolute z-50 left-0 top-0">
                                  {statoIdoneita.abile ? (
                                    <>
                                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm font-semibold outline-none focus:border-red-500">
                                        <option value="Da Valutare">⏳ Da Valutare</option>
                                        <option value="Contattato">📞 Contattato</option>
                                        <option value="Confermato">✅ Confermato</option>
                                        <option value="Da Ricontattare">🔄 Da Ricontattare</option>
                                      </select>
                                      {(editStatus === "Contattato" || editStatus === "Confermato" || editStatus === "Da Valutare") && (
                                        <select value={editData} onChange={(e) => setEditData(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-red-500 font-medium">
                                          <option value="">-- Seleziona la data --</option>
                                          {getSlotDisponibili().map(slot => <option key={slot.date} value={slot.date}>{new Date(slot.date).toLocaleDateString('it-IT')} ({slot.occupati}/4 occupati)</option>)}
                                        </select>
                                      )}
                                      {editStatus === "Da Ricontattare" && (
                                        <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Motivazione..." className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm h-14 resize-none outline-none"></textarea>
                                      )}
                                    </>
                                  ) : (<div className="bg-red-50 p-2 text-center text-xs text-red-600 font-bold rounded">Bloccato: {statoIdoneita.motivo}</div>)}
                                  <div className="flex space-x-2">
                                    <button onClick={() => salvaModificheTurno(c.id)} disabled={!statoIdoneita.abile} className="flex-1 bg-red-600 text-white py-1.5 rounded text-xs font-black disabled:opacity-30">SALVA</button>
                                    <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-500 py-1.5 rounded text-xs font-bold">ANNULLA</button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className={`px-2.5 py-1 rounded-md font-bold text-xs border ${c.shift_status === 'Confermato' ? 'bg-green-50 text-green-700 border-green-200' : c.shift_status === 'Contattato' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{c.shift_status}</span>
                                  {c.data_disponibilita && <div className="text-[11px] text-slate-500 mt-2 font-bold">Data: {new Date(c.data_disponibilita).toLocaleDateString('it-IT')}</div>}
                                </div>
                              )}
                            </td>
                          )}

                          <td className="p-4 pr-6 text-right align-top">
                            {(vistaAttiva === "Da Smistare" || vistaAttiva === "Pending") && editingId !== c.id && (
                              <button onClick={() => { setEditingId(c.id); setEditStatus(c.shift_status); setEditNote(c.note_ricontatto || ""); setEditData(c.data_disponibilita || ""); }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600">Gestisci</button>
                            )}

                            {vistaAttiva === "Ci voglio pensare" && editingId !== c.id && (
                              <button onClick={() => setEditingId(c.id)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold">Esito Ricontatto</button>
                            )}

                            {vistaAttiva === "Ci voglio pensare" && editingId === c.id && (
                              <div className="absolute right-6 bg-white p-3 shadow-xl border rounded-xl w-48 text-left z-50">
                                <select onChange={(e) => { if(e.target.value) impostaDaPensarci(c.id, e.target.value as 'SI' | 'NO'); }} className="w-full border mb-2 rounded p-1 text-sm">
                                  <option value="">Seleziona...</option><option value="SI">✅ Accetta</option><option value="NO">❌ Rifiuta</option>
                                </select>
                                <button onClick={() => setEditingId(null)} className="w-full bg-slate-100 py-1 rounded text-xs font-bold">Annulla</button>
                              </div>
                            )}

                            {vistaAttiva === "Archivio" && (
                              <button onClick={() => eliminaCandidato(c.id)} className="bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all">Elimina</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
