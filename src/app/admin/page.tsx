"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Candidato, Professore } from "@/types/admin";
import Sidebar from "@/components/admin/Sidebar";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  
  const [candidature, setCandidature] = useState<Candidato[]>([]);
  const [professori, setProfessori] = useState<Professore[]>([]);
  
  // Loading: animazione solo al primo caricamento
  const [initialLoad, setInitialLoad] = useState(true);
  const [loading, setLoading] = useState(true);
  const [fraseLoading, setFraseLoading] = useState("Organizzando i turni...");
  const frasiDivertenti = ["Organizzando i turni...", "Svegliando i vampiri...", "Smistando le candidature...", "Calcolando le statistiche..."];

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [annoAttivo, setAnnoAttivo] = useState<string>("Tutti");
  const [vistaAttiva, setVistaAttivo] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<any>("");
  const [editNote, setEditNote] = useState("");
  const [editData, setEditData] = useState("");
  const [expandedTurno, setExpandedTurno] = useState<string | null>(null);

  const [editingProf, setEditingProf] = useState<Partial<Professore> | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(true);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && initialLoad && session) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % frasiDivertenti.length;
        setFraseLoading(frasiDivertenti[i]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading, initialLoad, session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const toastId = toast.loading("Accesso in corso...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error("Errore: " + error.message, { id: toastId }); setIsLoggingIn(false); } 
    else { toast.success("Accesso effettuato!", { id: toastId }); setIsLoggingIn(false); fetchData(true); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const fetchData = async (isFirst = false) => {
    if (isFirst) setLoading(true);
    const [candRes, profRes] = await Promise.all([
      supabase.from('candidature').select('*').order('created_at', { ascending: true }),
      supabase.from('professori').select('*').order('scuola', { ascending: true })
    ]);

    if (!candRes.error) {
      setCandidature(candRes.data || []);
      if (candRes.data && candRes.data.length > 0 && annoAttivo === "Tutti") {
          const anni = Array.from(new Set(candRes.data.map(c => calcolaAnnoScolastico(c.created_at)))).sort().reverse();
          if(anni.length > 0) setAnnoAttivo(anni[0]);
      }
    } else toast.error("Errore candidature");

    if (!profRes.error) setProfessori(profRes.data || []);

    if (isFirst) {
      setTimeout(() => { setLoading(false); setInitialLoad(false); }, 1500); 
    }
  };

  // --- LOGICA E CALCOLI ---
  const calcolaAnnoScolastico = (dataString: string) => {
    if (!dataString) return "Sconosciuto";
    const d = new Date(dataString); const year = d.getFullYear();
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

  const anniSet = new Set(candidature.map(c => calcolaAnnoScolastico(c.created_at)));
  const anniDisponibili = ["Tutti", ...Array.from(anniSet)].sort().reverse();
  const datiFiltratiAnno = annoAttivo === "Tutti" ? candidature : candidature.filter(c => calcolaAnnoScolastico(c.created_at) === annoAttivo);

  const inGestione = datiFiltratiAnno.filter(c => 
    (c.tipo_adesione === "Aspirante" || c.tipo_adesione === "SI" || c.tipo_adesione === "SÌ") && 
    (c.shift_status === "Da Valutare" || c.shift_status === "Da Ricontattare")
  ).sort((a, b) => a.shift_status === "Da Valutare" && b.shift_status === "Da Ricontattare" ? -1 : 1);

  const giaDonatori = datiFiltratiAnno.filter(c => 
    c.tipo_adesione === "Già Donatore" && 
    (c.shift_status === "Da Valutare" || c.shift_status === "Da Ricontattare")
  ).sort((a, b) => a.shift_status === "Da Valutare" && b.shift_status === "Da Ricontattare" ? -1 : 1);

  const pending = datiFiltratiAnno.filter(c => c.shift_status === "Contattato").sort((a, b) => new Date(a.data_disponibilita || "").getTime() - new Date(b.data_disponibilita || "").getTime());
  const turniConfermati = datiFiltratiAnno.filter(c => c.shift_status === "Confermato").sort((a, b) => new Date(b.data_disponibilita || "").getTime() - new Date(a.data_disponibilita || "").getTime());
  
  const pensarci = datiFiltratiAnno.filter(c => c.tipo_adesione === "Voglio pensarci");
  const rifiutati = datiFiltratiAnno.filter(c => c.tipo_adesione === "NO"); // AGGIUNTO!
  const archivio = datiFiltratiAnno; 

  let datiMostrati: Candidato[] = [];
  if (vistaAttiva === "In Gestione") datiMostrati = inGestione;
  if (vistaAttiva === "Già Donatori") datiMostrati = giaDonatori;
  if (vistaAttiva === "Pending") datiMostrati = pending;
  if (vistaAttiva === "Ci voglio pensare") datiMostrati = pensarci;
  if (vistaAttiva === "Rifiutati (No)") datiMostrati = rifiutati; // AGGIUNTO!
  if (vistaAttiva === "Archivio") datiMostrati = archivio;

  // Avviso giornaliero nuovi contatti
  useEffect(() => {
    if (vistaAttiva === "In Gestione" && inGestione.length > 0) {
      const lastAlert = localStorage.getItem("lastContactAlert");
      const today = new Date().toDateString();
      if (lastAlert !== today) {
        toast.success(`Hai ${inGestione.length} iscritti in gestione. Ricordati di aggiungere i nuovi ai Contatti Google!`, { icon: '💡', duration: 6000 });
        localStorage.setItem("lastContactAlert", today);
      }
    }
    setSelectedContacts(new Set()); 
  }, [vistaAttiva, annoAttivo]);

  // Gestione selezioni Checkbox
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedContacts(newSet);
  };
  const toggleAll = () => {
    if (selectedContacts.size === datiMostrati.length) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(datiMostrati.map(c => c.id)));
  };

  const esportaGoogleContatti = () => {
    const contattiDaEsportare = datiMostrati.filter(c => selectedContacts.has(c.id));
    if (contattiDaEsportare.length === 0) return toast.error("Seleziona almeno una persona spuntando le caselle.");
    
    const header = ["Given Name", "Family Name", "Phone 1 - Type", "Phone 1 - Value", "E-mail 1 - Type", "E-mail 1 - Value", "Organization 1 - Name", "Notes"].join(",");
    const rows = contattiDaEsportare.map(c => {
       const nome = c.nome ? c.nome.replace(/"/g, '""') : "";
       const cognome = c.cognome ? c.cognome.replace(/"/g, '""') : "";
       const telefono = c.cellulare ? c.cellulare.replace(/\D/g,'') : "";
       const email = c.email ? c.email.replace(/"/g, '""') : "";
       const scuola = c.istituto ? c.istituto.replace(/"/g, '""') : "";
       const classe = c.classe ? c.classe.replace(/"/g, '""') : "";
       return `"${nome}","${cognome}","Mobile","${telefono}","Home","${email}","${scuola}","Classe: ${classe}"`;
    }).join("\n");
    
    const csvContent = "\uFEFF" + header + "\n" + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Donato_Contatti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Esportati ${contattiDaEsportare.length} contatti! Vai su Google Contatti -> Importa`);
  };

  const salvaModificheTurno = async (id: string) => {
    if (editStatus === 'Da Ricontattare' && (!editData || !editNote)) {
      return toast.error("Devi inserire il motivo e la data da cui è possibile ricontattarlo.");
    }
    const salvataggio = toast.loading("Salvataggio in corso...");
    const { error } = await supabase.from('candidature').update({ shift_status: editStatus, note_ricontatto: editNote, data_disponibilita: editData || null }).eq('id', id);
    if (!error) { toast.success("Turno aggiornato", { id: salvataggio }); setEditingId(null); fetchData(); } 
    else toast.error("Errore: " + error.message, { id: salvataggio });
  };

  const rimuoviDaTurno = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">Rimuovere dalla visita?</p>
        <p className="text-xs text-slate-500">Il ragazzo tornerà in stato "Da Valutare".</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => { toast.dismiss(t.id);
            const { error } = await supabase.from('candidature').update({ shift_status: 'Da Valutare', data_disponibilita: null, note_ricontatto: null }).eq('id', id);
            if (!error) { toast.success("Rimosso con successo"); fetchData(); }
          }} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold">Sì, rimuovi</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 px-3 py-1.5 rounded text-xs font-bold">Annulla</button>
        </div>
      </div>
    ));
  };

  const impostaDaPensarci = async (id: string, scelta: 'SI' | 'NO') => {
    const tipo = scelta === 'SI' ? 'Aspirante' : 'NO';
    const status = 'Da Valutare';
    const note = scelta === 'NO' ? 'Non interessato.' : 'Ha accettato dopo averci pensato.';
    const { error } = await supabase.from('candidature').update({ tipo_adesione: tipo, shift_status: status, note_ricontatto: note }).eq('id', id);
    if (!error) { toast.success("Scelta registrata!"); setEditingId(null); fetchData(); }
  };

  const eliminaCandidato = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800 text-sm">Vuoi eliminare definitivamente questa persona?</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => { toast.dismiss(t.id);
            const loadToast = toast.loading("Eliminazione...");
            setCandidature(prev => prev.filter(c => c.id !== id));
            const { error } = await supabase.from('candidature').delete().eq('id', id);
            if (!error) toast.success("Eliminato!", { id: loadToast });
            else { fetchData(); toast.error("Errore.", { id: loadToast }); }
          }} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md">Elimina Ora</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200">Annulla</button>
        </div>
      </div>
    ));
  };

  const getSlotDisponibili = () => {
    const occupatiPerData = datiFiltratiAnno.reduce((acc: Record<string, number>, c) => {
      if ((c.shift_status === 'Contattato' || c.shift_status === 'Confermato') && c.data_disponibilita) acc[c.data_disponibilita] = (acc[c.data_disponibilita] || 0) + 1;
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

  // --- STATISTICHE ISTOGRAMMI ---
  const statsScuole = datiFiltratiAnno.reduce((acc: Record<string, number>, c) => {
    const scuola = c.istituto || "Altro";
    acc[scuola] = (acc[scuola] || 0) + 1;
    return acc;
  }, {});
  const scuoleOrdinate = Object.entries(statsScuole).sort((a, b) => b[1] - a[1]);
  const maxScuolaCount = scuoleOrdinate.length > 0 ? scuoleOrdinate[0][1] : 1;

  // Andamento Storico per Dashboard "Tutti"
  const trendScuole: Record<string, Record<string, number>> = {};
  if (annoAttivo === "Tutti") {
    candidature.forEach(c => {
      const s = c.istituto || "Altro";
      const a = calcolaAnnoScolastico(c.created_at);
      if(!trendScuole[s]) trendScuole[s] = {};
      trendScuole[s][a] = (trendScuole[s][a] || 0) + 1;
    });
  }
  const anniTrend = anniDisponibili.filter(a => a !== "Tutti").reverse();

  // Raggruppamento PENDING per data
  const pendingRaggruppato = pending.reduce((acc: Record<string, Candidato[]>, c) => {
    const data = c.data_disponibilita || "Data non assegnata";
    if(!acc[data]) acc[data] = [];
    acc[data].push(c);
    return acc;
  }, {});

  const getBadgeArchivio = (tipo: string) => {
    if (tipo === "SÌ" || tipo === "SI" || tipo === "Aspirante") return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-green-200 shadow-sm">Sì / Aspirante</span>;
    if (tipo === "Già Donatore") return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-blue-200 shadow-sm">Già Donatore</span>;
    if (tipo === "Voglio pensarci") return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-amber-200 shadow-sm">Ci Pensa</span>;
    if (tipo === "NO") return <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-slate-300 shadow-sm">Rifiutato (No)</span>;
    return null;
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 selection:bg-red-500 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl text-center w-full max-w-sm animate-in zoom-in duration-300">
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

  // LOGO RIMBALZANTE SOLO AL PRIMO LOAD
  if (loading && initialLoad) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="relative mb-8">
        <img src="/favicon.ico" alt="Loading" className="w-24 h-24 animate-bounce object-contain z-10 relative" />
        <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-slate-700 animate-pulse text-center px-4">{fraseLoading}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 selection:bg-red-200">
      <Sidebar 
        vistaAttiva={vistaAttiva} setVistaAttivo={setVistaAttivo} 
        emailAmministratore={session.user.email} handleLogout={handleLogout}
        isMobileOpen={isSidebarOpen} setIsMobileOpen={setIsSidebarOpen}
        conteggi={{ 
          inGestione: inGestione.length, 
          giaDonatori: giaDonatori.length, 
          pending: pending.length, 
          confermati: turniConfermati.length, 
          pensarci: pensarci.length, 
          rifiutati: rifiutati.length, // AGGIUNTO!
          archivio: candidature.length 
        }}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center z-10 shadow-sm gap-4">
          <div className="flex justify-between items-center w-full md:w-auto">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">{vistaAttiva}</h2>
              {vistaAttiva !== "Rubrica Prof" && <p className="text-xs md:text-sm text-slate-500 font-medium">{vistaAttiva === "Visite Confermate" ? turniConfermati.length : datiMostrati.length} risposte visualizzate</p>}
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-slate-100 p-2 rounded-lg text-slate-600 shadow-sm border border-slate-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {vistaAttiva === "In Gestione" && (
              <button onClick={esportaGoogleContatti} className="flex items-center bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-blue-100 transition-colors shadow-sm">
                <span className="md:mr-2 text-base">📥</span>
                <span className="hidden md:inline">Esporta Selezionati (CSV)</span>
                <span className="md:hidden">CSV</span>
              </button>
            )}

            <button onClick={() => fetchData(false)} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-slate-200 transition-colors shadow-sm">
              <svg className={`w-4 h-4 md:mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span className="hidden md:inline">Aggiorna</span>
            </button>
            
            {vistaAttiva !== "Rubrica Prof" && (
              <select value={annoAttivo} onChange={(e) => setAnnoAttivo(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs md:text-sm rounded-lg px-2 py-2 font-bold outline-none cursor-pointer shadow-sm w-full md:w-auto mt-2 md:mt-0">
                {anniDisponibili.map(anno => <option key={anno} value={anno}>{anno}</option>)}
              </select>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative bg-slate-50">
          
          {/* DASHBOARD CON ISTOGRAMMI */}
          {vistaAttiva === "Dashboard" && (
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl">👥</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Totale Iscritti</p><p className="text-3xl font-black text-slate-800">{datiFiltratiAnno.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl">✅</div>
                  <div><p className="text-sm text-slate-500 font-semibold">Visite Confermate</p><p className="text-3xl font-black text-slate-800">{turniConfermati.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-xl">⏳</div>
                  <div><p className="text-sm text-slate-500 font-semibold">In Gestione</p><p className="text-3xl font-black text-slate-800">{inGestione.length}</p></div>
                </div>
              </div>

              {/* ISTOGRAMMA SCUOLE */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🏫</span> Rendimento Scuole ({annoAttivo})</h3>
                <div className="space-y-4">
                  {scuoleOrdinate.map(([scuola, count]) => (
                    <div key={scuola} className="flex flex-col md:flex-row md:items-center">
                      <div className="w-full md:w-48 text-sm font-bold text-slate-700 truncate mb-1 md:mb-0" title={scuola}>{scuola}</div>
                      <div className="flex-1 flex items-center">
                        <div className="h-6 bg-red-100 rounded-r-md relative" style={{ width: `${(count / maxScuolaCount) * 100}%`, minWidth: '20px' }}>
                          <div className="absolute inset-y-0 left-0 bg-red-500 rounded-r-md opacity-80" style={{ width: '100%' }}></div>
                        </div>
                        <span className="ml-3 font-black text-red-600">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ANDAMENTO ANNI (Solo se TUTTI è selezionato) */}
              {annoAttivo === "Tutti" && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">📈</span> Andamento Storico</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-3 font-bold text-slate-600">Scuola</th>
                          {anniTrend.map(a => <th key={a} className="py-3 font-bold text-slate-500 text-center">{a}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.keys(trendScuole).map(scuola => (
                          <tr key={scuola} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 font-bold text-slate-800">{scuola}</td>
                            {anniTrend.map(a => (
                              <td key={a} className="py-3 text-center">
                                {trendScuole[scuola][a] ? (
                                  <span className="bg-red-50 text-red-700 font-bold px-2 py-1 rounded">{trendScuole[scuola][a]}</span>
                                ) : <span className="text-slate-300">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISITE CONFERMATE */}
          {vistaAttiva === "Visite Confermate" && (
            <div className="space-y-4 animate-in fade-in max-w-6xl mx-auto">
              {turniConfermati.length === 0 && (
                <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-lg font-bold text-slate-700">Non ci sono visite confermate.</h3>
                </div>
              )}
              {Object.entries(
                turniConfermati.reduce((acc: Record<string, Candidato[]>, c) => {
                  const data = c.data_disponibilita || "Data non impostata";
                  if (!acc[data]) acc[data] = [];
                  acc[data].push(c);
                  return acc;
                }, {} as Record<string, Candidato[]>)
              ).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([data, persone]) => (
                <div key={data} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div onClick={() => setExpandedTurno(expandedTurno === data ? null : data)} className="bg-slate-50 p-4 md:px-6 md:py-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3 md:space-x-4">
                      <span className="text-xl md:text-2xl">{expandedTurno === data ? '📂' : '📅'}</span>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm md:text-lg">{data !== "Data non impostata" ? new Date(data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : data}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">{data !== "Data non impostata" ? 'Ospedale di Feltre' : 'Da organizzare'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                      <span className="bg-green-100 text-green-700 text-xs md:text-sm font-bold px-2 py-1 rounded-full border border-green-200 whitespace-nowrap">{persone.length}/4</span>
                    </div>
                  </div>
                  
                  {expandedTurno === data && (
                    <div className="p-4 md:p-6 bg-white border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {persone.map((p) => (
                          <div key={p.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative group hover:shadow-md transition-shadow">
                            <p className="font-black text-slate-800 text-lg leading-tight">{p.nome} {p.cognome}</p>
                            <p className="text-xs text-slate-500 mb-1 mt-1"><strong>Nato:</strong> {p.data_nascita ? new Date(p.data_nascita).toLocaleDateString('it-IT') : 'N/D'}</p>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.ha_fatto_ecg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>ECG: {p.ha_fatto_ecg ? "Sì" : "No"}</span>
                            <p className="text-xs text-slate-500 mt-2 mb-2">{p.istituto}</p>
                            
                            {/* AZIONI RAPIDE CONTATTI */}
                            <div className="flex flex-col space-y-2 mt-2 mb-4 border-t border-slate-200 pt-3">
                              <span className="text-[12px] font-bold text-slate-700 flex items-center mb-1"><span className="mr-1 text-base">📱</span> {p.cellulare}</span>
                              <div className="flex space-x-2">
                                <a href={`https://wa.me/39${p.cellulare.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 border border-green-200 px-2 py-1.5 rounded text-[10px] font-black uppercase text-center hover:bg-green-200 transition-colors flex-1">WhatsApp</a>
                                <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${p.email}`} target="_blank" rel="noopener noreferrer" className="bg-slate-200 text-slate-700 border border-slate-300 px-2 py-1.5 rounded text-[10px] font-black uppercase text-center hover:bg-slate-300 transition-colors flex-1">Gmail</a>
                              </div>
                              <span className="text-[11px] font-medium text-slate-500 truncate flex items-center mt-1" title={p.email}>{p.email}</span>
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); rimuoviDaTurno(p.id); }} className="absolute top-3 right-3 bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-red-200">Rimuovi</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TABELLE DINAMICHE INCLUSE RIFIUTATI */}
          {["In Gestione", "Già Donatori", "Pending", "Ci voglio pensare", "Rifiutati (No)", "Archivio"].includes(vistaAttiva) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              {datiMostrati.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-lg font-bold text-slate-700">Non ci sono risposte in questa sezione.</h3>
                  <p className="text-slate-500 text-sm mt-2">Nessun ragazzo trovato con questo stato o anno.</p>
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[500px]">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        {vistaAttiva === "In Gestione" && (
                          <th className="p-4 w-12 text-center border-r border-slate-100">
                            <input type="checkbox" onChange={toggleAll} checked={selectedContacts.size === datiMostrati.length && datiMostrati.length > 0} className="w-4 h-4 accent-red-600 rounded cursor-pointer" />
                          </th>
                        )}
                        <th className={`p-4 font-bold ${vistaAttiva !== "In Gestione" ? "pl-6" : ""}`}>Profilo</th>
                        <th className="p-4 font-bold">Contatti Rapidi</th>
                        <th className="p-4 font-bold">Scuola & Medica</th>
                        {["In Gestione", "Già Donatori", "Pending"].includes(vistaAttiva) && <th className="p-4 font-bold">Stato Turno</th>}
                        {vistaAttiva !== "Archivio" ? <th className="p-4 font-bold pr-6 text-right">Azioni</th> : <th className="p-4 font-bold pr-6 text-right text-red-500">Zona Pericolo</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      
                      {vistaAttiva === "Pending" ? (
                        // RENDERING SPECIALE PER PENDING: RAGGRUPPATO PER TURNO
                        Object.entries(pendingRaggruppato)
                          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                          .map(([dataTurno, candidatiDelTurno]) => (
                            <React.Fragment key={dataTurno}>
                              {/* RIGA SEPARATORE DATA */}
                              <tr className="bg-blue-50/50 border-t-2 border-blue-200">
                                <td colSpan={5} className="py-2 px-6 font-black text-blue-800 text-xs uppercase tracking-widest">
                                  📅 Turno in attesa: {dataTurno !== "Data non assegnata" ? new Date(dataTurno).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : dataTurno}
                                </td>
                              </tr>
                              {/* RIGHE DEI CANDIDATI DI QUEL TURNO */}
                              {candidatiDelTurno.map((c) => {
                                const statoIdoneita = checkIdoneita(c);
                                return (
                                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6 align-top border-l-4 border-transparent hover:border-blue-400">
                                      <div className="text-xs text-slate-400 font-medium mb-1">{new Date(c.created_at).toLocaleDateString('it-IT')}</div>
                                      <div className={`font-extrabold text-base flex flex-col items-start ${statoIdoneita.color}`}>
                                        <span>{c.nome} {c.cognome}</span>
                                        {!statoIdoneita.abile && <span className="mt-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{statoIdoneita.motivo}</span>}
                                      </div>
                                    </td>
                                    <td className="p-4 align-top">
                                      <div className="mb-3 border-b border-slate-100 pb-2 flex items-center space-x-3">
                                        <span className="text-slate-800 font-bold flex items-center"><span className="mr-1 text-base">📱</span> {c.cellulare}</span>
                                        <a href={`https://wa.me/39${c.cellulare.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide hover:bg-green-100 transition-colors">WhatsApp</a>
                                      </div>
                                      <div>
                                        <div className="flex items-center space-x-2 text-slate-600 text-xs mb-1.5 font-medium"><span className="text-base">✉️</span> <span className="truncate max-w-[150px]" title={c.email}>{c.email}</span></div>
                                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${c.email}`} target="_blank" rel="noopener noreferrer" className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide hover:bg-slate-200 inline-block transition-colors">Gmail</a>
                                      </div>
                                    </td>
                                    <td className="p-4 align-top">
                                      <div className="font-bold text-slate-700">{c.istituto}</div>
                                      <div className="text-xs text-slate-500 mb-1">Classe: {c.classe || "-"}</div>
                                      {c.ha_fatto_ecg !== null && <div className="text-[10px] mt-1 bg-slate-100 border border-slate-200 text-slate-600 inline-block px-2 py-0.5 rounded font-bold">ECG: <span className={`${c.ha_fatto_ecg ? "text-green-600" : "text-red-600"}`}>{c.ha_fatto_ecg ? "Sì" : "No"}</span></div>}
                                    </td>
                                    <td className="p-4 align-top">
                                      <span className="px-2.5 py-1 rounded-md font-bold text-xs border inline-block bg-blue-50 text-blue-700 border-blue-200">📞 Contattato</span>
                                    </td>
                                    <td className="p-4 pr-6 text-right align-top">
                                      {editingId !== c.id && <button onClick={() => { setEditingId(c.id); setEditStatus(c.shift_status); setEditNote(c.note_ricontatto || ""); setEditData(c.data_disponibilita || ""); }} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600 shadow-sm whitespace-nowrap">Gestisci</button>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))
                      ) : (
                        // RENDERING NORMALE PER TUTTE LE ALTRE TAB
                        datiMostrati.map((c) => {
                          const statoIdoneita = checkIdoneita(c);
                          // Controllo visivo "Da Ricontattare" Bloccato
                          const isLocked = c.shift_status === 'Da Ricontattare' && c.data_disponibilita && new Date(c.data_disponibilita) > new Date();

                          return (
                            <tr key={c.id} className={`group ${isLocked ? 'bg-yellow-50/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                              {vistaAttiva === "In Gestione" && (
                                <td className="p-4 text-center border-r border-slate-100 align-top pt-5">
                                  <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={() => toggleSelection(c.id)} className="w-4 h-4 accent-red-600 rounded cursor-pointer" />
                                </td>
                              )}
                              <td className={`p-4 align-top ${vistaAttiva !== "In Gestione" ? "pl-6" : ""}`}>
                                <div className="text-xs text-slate-400 font-medium mb-1">{new Date(c.created_at).toLocaleDateString('it-IT')}</div>
                                <div className={`font-extrabold text-base flex flex-col items-start ${statoIdoneita.color}`}>
                                  <span>{isLocked && <span title="In Pausa">🔒 </span>}{c.nome} {c.cognome}</span>
                                  {!statoIdoneita.abile && <span className="mt-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{statoIdoneita.motivo}</span>}
                                </div>
                                <div className="mt-1.5">
                                  {vistaAttiva === "Archivio" ? getBadgeArchivio(c.tipo_adesione) : <span className="text-[10px] uppercase font-bold tracking-wider inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{c.tipo_adesione}</span>}
                                </div>
                              </td>

                              <td className="p-4 align-top">
                                <div className="mb-3 border-b border-slate-100 pb-2 flex items-center space-x-3">
                                  <span className="text-slate-800 font-bold flex items-center"><span className="mr-1 text-base">📱</span> {c.cellulare}</span>
                                  <a href={`https://wa.me/39${c.cellulare.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide hover:bg-green-100 transition-colors">WhatsApp</a>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2 text-slate-600 text-xs mb-1.5 font-medium"><span className="text-base">✉️</span> <span className="truncate max-w-[150px]" title={c.email}>{c.email}</span></div>
                                  <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${c.email}`} target="_blank" rel="noopener noreferrer" className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide hover:bg-slate-200 inline-block transition-colors">Gmail</a>
                                </div>
                              </td>

                              <td className="p-4 align-top">
                                <div className="font-bold text-slate-700">{c.istituto}</div>
                                <div className="text-xs text-slate-500 mb-1">Classe: {c.classe || "-"}</div>
                                {c.ha_fatto_ecg !== null && <div className="text-[10px] mt-1 bg-slate-100 border border-slate-200 text-slate-600 inline-block px-2 py-0.5 rounded font-bold">ECG: <span className={`${c.ha_fatto_ecg ? "text-green-600" : "text-red-600"}`}>{c.ha_fatto_ecg ? "Sì" : "No"}</span></div>}
                              </td>

                              {["In Gestione", "Già Donatori"].includes(vistaAttiva) && (
                                <td className="p-4 align-top">
                                  {editingId !== c.id && (
                                    <div>
                                      <span className={`px-2.5 py-1 rounded-md font-bold text-xs border inline-block ${c.shift_status === 'Confermato' ? 'bg-green-50 text-green-700 border-green-200' : c.shift_status === 'Contattato' ? 'bg-blue-50 text-blue-700 border-blue-200' : c.shift_status === 'Da Ricontattare' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{c.shift_status}</span>
                                      {c.shift_status === 'Da Ricontattare' && c.data_disponibilita && (
                                        <div className="mt-2">
                                          <div className={`text-[10px] font-bold ${isLocked ? 'text-red-600' : 'text-green-600'} flex items-center`}>
                                            {isLocked ? '⏳ In pausa fino al:' : '✅ Riprovare dal:'} {new Date(c.data_disponibilita).toLocaleDateString('it-IT')}
                                          </div>
                                          {c.note_ricontatto && <div className="text-[10px] text-slate-500 italic mt-1 leading-tight border-l-2 border-yellow-300 pl-1.5">"{c.note_ricontatto}"</div>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              )}

                              <td className="p-4 pr-6 text-right align-top">
                                {["In Gestione", "Già Donatori"].includes(vistaAttiva) && editingId !== c.id && (
                                  <button onClick={() => { setEditingId(c.id); setEditStatus(c.shift_status); setEditNote(c.note_ricontatto || ""); setEditData(c.data_disponibilita || ""); }} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600 shadow-sm whitespace-nowrap">Gestisci</button>
                                )}
                                {vistaAttiva === "Ci voglio pensare" && editingId !== c.id && (
                                  <button onClick={() => setEditingId(c.id)} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600 shadow-sm whitespace-nowrap">Esito Ricontatto</button>
                                )}
                                {vistaAttiva === "Archivio" && (
                                  <button onClick={() => eliminaCandidato(c.id)} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm">Elimina</button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MODALI (Turni / Ricontatto) */}
          {editingId && ["In Gestione", "Già Donatori", "Pending"].includes(vistaAttiva) && (() => {
            const candidatoEdit = candidature.find(c => c.id === editingId);
            const isLocked = candidatoEdit?.shift_status === 'Da Ricontattare' && candidatoEdit?.data_disponibilita && new Date(candidatoEdit.data_disponibilita) > new Date();

            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingId(null)}>
                <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-red-500 w-full max-w-sm space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-black text-slate-800 text-lg border-b border-slate-100 pb-2">Gestisci Turno</h3>
                  
                  {checkIdoneita(candidatoEdit!).abile ? (
                    <>
                      {isLocked && editStatus === 'Da Ricontattare' && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 font-medium">
                          🔒 Questa persona è in pausa fino al <b className="text-red-600">{new Date(candidatoEdit!.data_disponibilita!).toLocaleDateString('it-IT')}</b>.<br/>
                          Per poterla inserire in un turno, imposta prima lo stato su <b>"Da Valutare"</b>.
                        </div>
                      )}

                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-red-500 bg-slate-50">
                        <option value="Da Valutare">⏳ Da Valutare</option>
                        <option value="Da Ricontattare">🔄 Da Ricontattare</option>
                        {(!isLocked || editStatus !== 'Da Ricontattare') && <option value="Contattato">📞 Contattato</option>}
                        {(!isLocked || editStatus !== 'Da Ricontattare') && <option value="Confermato">✅ Confermato</option>}
                      </select>

                      {(editStatus === "Contattato" || editStatus === "Confermato" || editStatus === "Da Valutare") && (
                        <select value={editData} onChange={(e) => setEditData(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 font-medium bg-slate-50">
                          <option value="">-- Seleziona la data della visita --</option>
                          {getSlotDisponibili().map(slot => <option key={slot.date} value={slot.date}>{new Date(slot.date).toLocaleDateString('it-IT')} ({slot.occupati}/4 occupati)</option>)}
                        </select>
                      )}

                      {editStatus === "Da Ricontattare" && (
                        <div className="space-y-3 bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Ricontattabile dal giorno:</label>
                            <input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 mt-1" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Motivo (Obbligatorio):</label>
                            <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Es: Ha il raffreddore, provare mese prossimo..." required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-16 resize-none outline-none focus:border-red-500 mt-1"></textarea>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (<div className="bg-red-50 p-4 text-center text-sm text-red-600 font-bold rounded-lg border border-red-200">Azione bloccata: L'utente non è idoneo.</div>)}
                  
                  <div className="flex space-x-3 pt-2">
                    <button onClick={() => salvaModificheTurno(editingId)} disabled={!checkIdoneita(candidatoEdit!).abile} className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-black shadow-lg disabled:opacity-30 hover:bg-red-700">SALVA</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200">ANNULLA</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {editingId && vistaAttiva === "Ci voglio pensare" && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingId(null)}>
              <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-xs space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Esito Ricontatto</h3>
                <select onChange={(e) => { if(e.target.value) impostaDaPensarci(editingId, e.target.value as 'SI' | 'NO'); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-red-500 bg-slate-50">
                  <option value="">Seleziona...</option><option value="SI">✅ Accetta (Coda turni)</option><option value="NO">❌ Rifiuta</option>
                </select>
                <button onClick={() => setEditingId(null)} className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200">Annulla</button>
              </div>
            </div>
          )}

          {/* RUBRICA PROFESSORI */}
          {vistaAttiva === "Rubrica Prof" && (
            <div className="animate-in fade-in max-w-6xl mx-auto space-y-6">
              
              <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-800">Contatti Referenti</h3>
                  <p className="text-slate-500 text-xs md:text-sm">Gestisci i numeri utili delle scuole.</p>
                </div>
                <button onClick={() => setEditingProf({ scuola: "", nome: "", cognome: "", mail: "", cell: "" })} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs md:text-sm font-bold shadow-md hover:bg-red-700 whitespace-nowrap">
                  + Nuovo
                </button>
              </div>

              {editingProf && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-red-500 mb-6 animate-in slide-in-from-top-4">
                  <h3 className="font-black text-slate-800 mb-4">{editingProf.id ? "Modifica Professore" : "Aggiungi Professore"}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input placeholder="Scuola *" value={editingProf.scuola || ""} onChange={(e) => setEditingProf({...editingProf, scuola: e.target.value})} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm font-bold" />
                    <input placeholder="Nome" value={editingProf.nome || ""} onChange={(e) => setEditingProf({...editingProf, nome: e.target.value})} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
                    <input placeholder="Cognome" value={editingProf.cognome || ""} onChange={(e) => setEditingProf({...editingProf, cognome: e.target.value})} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
                    <input placeholder="Telefono" value={editingProf.cell || ""} onChange={(e) => setEditingProf({...editingProf, cell: e.target.value})} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
                    <input placeholder="Email" value={editingProf.mail || ""} onChange={(e) => setEditingProf({...editingProf, mail: e.target.value})} className="border border-slate-200 p-2.5 rounded-lg outline-none focus:border-red-500 text-sm" />
                  </div>
                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 mt-6">
                    <button onClick={salvaProfessore} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-red-700 w-full md:w-auto">Salva</button>
                    <button onClick={() => setEditingProf(null)} className="bg-slate-100 text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200 w-full md:w-auto">Annulla</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {professori.map((prof) => (
                  <div key={prof.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center font-black text-lg border border-red-100 shrink-0">
                          {prof.nome ? prof.nome[0] : prof.scuola[0]}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-slate-800 text-base md:text-lg leading-tight truncate">{prof.nome} {prof.cognome}</h3>
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{prof.scuola}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 shrink-0 ml-2">
                        <button onClick={() => setEditingProf(prof)} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 border border-blue-100 shadow-sm text-xs">✏️</button>
                        <button onClick={() => eliminaProf(prof.id)} className="text-red-600 bg-red-50 p-2 rounded-lg hover:bg-red-100 border border-red-100 shadow-sm text-xs">🗑️</button>
                      </div>
                    </div>
                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                      {prof.cell ? (
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-700 text-sm tracking-wide">{prof.cell}</span>
                          <a href={`https://wa.me/39${prof.cell.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-green-200">WhatsApp</a>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg">Nessun cellulare</div>
                      )}
                      {prof.mail ? (
                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${prof.mail}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 hover:bg-red-50 group transition-colors">
                          <span className="font-bold text-slate-700 text-xs truncate mr-2 group-hover:text-red-600">{prof.mail}</span>
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded text-[10px] font-black uppercase shrink-0 group-hover:bg-red-200">Gmail</span>
                        </a>
                      ) : (
                        <div className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg">Nessuna email</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

