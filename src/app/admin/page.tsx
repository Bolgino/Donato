"use client";
import { useState, useEffect } from "react";
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
  
  // Loading con animazione originale (Logo rimbalzante)
  const [loading, setLoading] = useState(true);
  const [fraseLoading, setFraseLoading] = useState("Verificando gli accessi...");
  const frasiDivertenti = ["Organizzando i turni...", "Svegliando i vampiri...", "Smistando le candidature...", "Calcolando le statistiche...", "Preparando i lettini...", "Controllando l'emoglobina..."];

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
  
  // Gestione selezioni per l'export dei contatti
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

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

  // Effetto per le frasi divertenti del caricamento
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const toastId = toast.loading("Accesso in corso...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error("Errore: " + error.message, { id: toastId }); setIsLoggingIn(false); } 
    else { toast.success("Accesso effettuato!", { id: toastId }); setIsLoggingIn(false); fetchData(); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const fetchData = async () => {
    setLoading(true);
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

    setTimeout(() => setLoading(false), 1500); 
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

  // FILTRI AGGIORNATI
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
  const archivio = datiFiltratiAnno; 

  let datiMostrati: Candidato[] = [];
  if (vistaAttiva === "In Gestione") datiMostrati = inGestione;
  if (vistaAttiva === "Già Donatori") datiMostrati = giaDonatori;
  if (vistaAttiva === "Pending") datiMostrati = pending;
  if (vistaAttiva === "Ci voglio pensare") datiMostrati = pensarci;
  if (vistaAttiva === "Archivio") datiMostrati = archivio;

  // Avviso giornaliero in Gestione (Deve stare sotto a inGestione)
  useEffect(() => {
    if (vistaAttiva === "In Gestione" && inGestione.length > 0) {
      const lastAlert = localStorage.getItem("lastContactAlert");
      const today = new Date().toDateString();
      if (lastAlert !== today) {
        toast.success(`Ci sono ${inGestione.length} nuovi iscritti, ricordati di esportarli in rubrica!`, { icon: '💡', duration: 6000 });
        localStorage.setItem("lastContactAlert", today);
      }
    }
    setSelectedContacts(new Set()); // Pulisce selezioni se cambi tab
  }, [vistaAttiva, annoAttivo, inGestione.length]);

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

  const statsScuole = datiFiltratiAnno.reduce((acc: Record<string, number>, c) => {
    const scuola = c.istituto || "Non specificato";
    acc[scuola] = (acc[scuola] || 0) + 1;
    return acc;
  }, {});
  const scuoleOrdinate = Object.entries(statsScuole).sort((a, b) => b[1] - a[1]);

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

  // --- ESPORTAZIONE GOOGLE CONTATTI (SOLO SELEZIONATI E SOLO IN GESTIONE) ---
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

  // Azioni Database
  const salvaModificheTurno = async (id: string) => {
    const salvataggio = toast.loading("Salvataggio in corso...");
    const { error } = await supabase.from('candidature').update({ shift_status: editStatus, note_ricontatto: editNote, data_disponibilita: editData || null }).eq('id', id);
    if (!error) { toast.success("Turno aggiornato", { id: salvataggio }); setEditingId(null); fetchData(); } 
    else toast.error("Errore: " + error.message, { id: salvataggio });
  };

  const impostaDaPensarci = async (id: string, scelta: 'SI' | 'NO') => {
    const tipo = scelta === 'SI' ? 'Aspirante' : 'NO';
    const status = 'Da Valutare';
    const note = scelta === 'NO' ? 'Non interessato.' : 'Ha accettato dopo averci pensato.';
    const { error } = await supabase.from('candidature').update({ tipo_adesione: tipo, shift_status: status, note_ricontatto: note }).eq('id', id);
    if (!error) { toast.success("Scelta registrata!"); setEditingId(null); fetchData(); }
  };

  const rimuoviDaTurno = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">Rimuovere dalla visita?</p>
        <div className="flex gap-2">
          <button onClick={async () => { toast.dismiss(t.id);
            const { error } = await supabase.from('candidature').update({ shift_status: 'Da Ricontattare', data_disponibilita: null, note_ricontatto: "Rimosso dal turno." }).eq('id', id);
            if (!error) { toast.success("Rimosso con successo"); fetchData(); }
          }} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">Sì, rimuovi</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 px-3 py-1 rounded text-xs font-bold">Annulla</button>
        </div>
      </div>
    ));
  };

  const eliminaCandidato = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800 text-sm">Vuoi eliminare definitivamente questa persona?</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => { toast.dismiss(t.id);
            const loadToast = toast.loading("Eliminazione in corso...");
            setCandidature(prev => prev.filter(c => c.id !== id));
            const { error } = await supabase.from('candidature').delete().eq('id', id);
            if (!error) toast.success("Eliminato definitivamente!", { id: loadToast });
            else { fetchData(); toast.error("Errore di eliminazione.", { id: loadToast }); }
          }} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md">Elimina Ora</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200">Annulla</button>
        </div>
      </div>
    ), { duration: 6000 });
  };

  const salvaProfessore = async () => {
    if (!editingProf?.scuola) return toast.error("La scuola è obbligatoria");
    const idToast = toast.loading("Salvataggio professore...");
    if (editingProf.id) {
      const { error } = await supabase.from('professori').update(editingProf).eq('id', editingProf.id);
      if (!error) { toast.success("Aggiornato!", {id: idToast}); setEditingProf(null); fetchData(); } else toast.error(error.message, {id: idToast});
    } else {
      const { error } = await supabase.from('professori').insert([editingProf]);
      if (!error) { toast.success("Aggiunto!", {id: idToast}); setEditingProf(null); fetchData(); } else toast.error(error.message, {id: idToast});
    }
  };

  const eliminaProf = async (id: string) => {
    if(!confirm("Vuoi eliminare questo professore?")) return;
    const {error} = await supabase.from('professori').delete().eq('id', id);
    if(!error) { toast.success("Professore rimosso"); fetchData(); }
  };

  // Funzione Badge Archivio
  const getBadgeArchivio = (tipo: string) => {
    if (tipo === "SÌ" || tipo === "SI" || tipo === "Aspirante") return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Sì / Aspirante</span>;
    if (tipo === "Già Donatore") return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Già Donatore</span>;
    if (tipo === "Voglio pensarci") return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Ci Pensa</span>;
    if (tipo === "NO") return <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Rifiutato (No)</span>;
    return null;
  };

  // --- RENDER LOGIN E LOADING ---
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

  // CARICAMENTO CON LOGO CHE RIMBALZA
  if (loading) return (
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
        conteggi={{ inGestione: inGestione.length, giaDonatori: giaDonatori.length, pending: pending.length, confermati: turniConfermati.length, pensarci: pensarci.length, archivio: candidature.length }}
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
            {/* TASTO EXPORT SOLO IN GESTIONE */}
            {vistaAttiva === "In Gestione" && (
              <button onClick={esportaGoogleContatti} className="flex items-center bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-blue-100 transition-colors shadow-sm">
                <span className="md:mr-2 text-base">📥</span>
                <span className="hidden md:inline">Esporta Selezionati (CSV)</span>
                <span className="md:hidden">CSV</span>
              </button>
            )}

            <button onClick={() => { toast.loading("Aggiornamento..."); fetchData(); }} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-slate-200 transition-colors shadow-sm">
              <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
          
          {vistaAttiva === "Dashboard" && (
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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

              {/* L'Albero / Funnel */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 hidden md:block">
                <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🌳</span> Flusso Smistamento</h3>
                <div className="flex flex-col items-center">
                  <div className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-md z-10 w-64 text-center border-b-4 border-slate-900">
                    Sì / Aspiranti ({daSmistare.length + pending.length + turniConfermati.length})
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
                      <div className="w-16 h-16 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center text-xl font-black text-slate-600 mb-3 shadow-sm">{daSmistare.filter(c => c.shift_status === "Da Valutare").length}</div>
                      <span className="text-sm font-bold text-slate-700 text-center">Da Valutare</span>
                    </div>
                    <div className="flex flex-col items-center w-1/4 px-2">
                      <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center text-xl font-black text-blue-600 mb-3 shadow-sm">{pending.length}</div>
                      <span className="text-sm font-bold text-blue-700 text-center">Pending</span>
                    </div>
                    <div className="flex flex-col items-center w-1/4 px-2">
                      <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center text-xl font-black text-green-600 mb-3 shadow-sm">{turniConfermati.length}</div>
                      <span className="text-sm font-bold text-green-700 text-center">Confermati</span>
                    </div>
                    <div className="flex flex-col items-center w-1/4 px-2">
                      <div className="w-16 h-16 rounded-full bg-yellow-50 border-4 border-yellow-200 flex items-center justify-center text-xl font-black text-yellow-600 mb-3 shadow-sm">{daSmistare.filter(c => c.shift_status === "Da Ricontattare").length}</div>
                      <span className="text-sm font-bold text-yellow-700 text-center">Da Ricontattare</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🏫</span> Rendimento Scuole ({annoAttivo})</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse min-w-[300px]">
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

          {vistaAttiva === "Visite Confermate" && (
            <div className="space-y-4 animate-in fade-in max-w-6xl mx-auto">
              {turniConfermati.length === 0 && (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
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
                            
                            {/* AZIONI RAPIDE CONTATTI: Solo WA e Mail */}
                            <div className="flex flex-col space-y-2 mt-2 mb-4 border-t border-slate-200 pt-2">
                              <span className="text-[12px] font-bold text-slate-700 flex items-center"><span className="mr-1 text-base">📱</span> {p.cellulare}</span>
                              <a href={`https://wa.me/39${p.cellulare.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-black uppercase text-center hover:bg-green-200 transition-colors">WhatsApp</a>
                              
                              <span className="text-[12px] font-medium text-slate-600 truncate flex items-center mt-2" title={p.email}><span className="mr-1 text-base">✉️</span> {p.email}</span>
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

          {["In Gestione", "Già Donatori", "Pending", "Ci voglio pensare", "Archivio"].includes(vistaAttiva) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              {datiMostrati.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-lg font-bold text-slate-700">Non ci sono risposte in questa sezione.</h3>
                  <p className="text-slate-500 text-sm mt-2">La lista è attualmente vuota.</p>
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[500px]">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        {/* HEADER CHECKBOX SOLO IN GESTIONE */}
                        {vistaAttiva === "In Gestione" && (
                          <th className="p-4 w-12 text-center border-r border-slate-100">
                            <input type="checkbox" onChange={toggleAll} checked={selectedContacts.size === datiMostrati.length && datiMostrati.length > 0} className="w-4 h-4 accent-red-600 rounded cursor-pointer" />
                          </th>
                        )}
                        <th className={`p-4 font-bold ${vistaAttiva !== "In Gestione" ? "pl-6" : ""}`}>Profilo</th>
                        <th className="p-4 font-bold">Contatti</th>
                        <th className="p-4 font-bold">Scuola & Medica</th>
                        {["In Gestione", "Già Donatori", "Pending"].includes(vistaAttiva) && <th className="p-4 font-bold">Stato Turno</th>}
                        {vistaAttiva !== "Archivio" ? <th className="p-4 font-bold pr-6 text-right">Azioni</th> : <th className="p-4 font-bold pr-6 text-right text-red-500">Zona Pericolo</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {datiMostrati.map((c) => {
                        const statoIdoneita = checkIdoneita(c);
                        return (
                          <tr key={c.id} className={`group ${c.shift_status === 'Da Ricontattare' ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                            
                            {/* CHECKBOX RIGA SOLO IN GESTIONE */}
                            {vistaAttiva === "In Gestione" && (
                              <td className="p-4 text-center border-r border-slate-100 align-top pt-5">
                                <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={() => toggleSelection(c.id)} className="w-4 h-4 accent-red-600 rounded cursor-pointer" />
                              </td>
                            )}

                            <td className={`p-4 align-top ${vistaAttiva !== "In Gestione" ? "pl-6" : ""}`}>
                              <div className="text-xs text-slate-400 font-medium mb-1">{new Date(c.created_at).toLocaleDateString('it-IT')}</div>
                              <div className={`font-extrabold text-base flex flex-col items-start ${statoIdoneita.color}`}>
                                <span>{c.nome} {c.cognome}</span>
                                {!statoIdoneita.abile && <span className="mt-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{statoIdoneita.motivo}</span>}
                              </div>
                              {/* BADGE ARCHIVIO/ALTRE TAB */}
                              <div className="mt-1.5">
                                {vistaAttiva === "Archivio" ? getBadgeArchivio(c.tipo_adesione) : <span className="text-[10px] uppercase font-bold tracking-wider inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600">{c.tipo_adesione}</span>}
                              </div>
                            </td>

                            <td className="p-4 align-top">
                              <div className="mb-3 border-b border-slate-100 pb-2">
                                <div className="flex items-center space-x-2 text-slate-800 font-bold mb-1.5"><span className="text-base">📱</span> <span>{c.cellulare}</span></div>
                                <a href={`https://wa.me/39${c.cellulare.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wide hover:bg-green-100 inline-block transition-colors">WhatsApp</a>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 text-slate-600 text-xs mb-1.5 font-medium"><span className="text-base">✉️</span> <span className="truncate max-w-[150px]" title={c.email}>{c.email}</span></div>
                                <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${c.email}`} target="_blank" rel="noopener noreferrer" className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wide hover:bg-slate-200 inline-block transition-colors">Gmail</a>
                              </div>
                            </td>

                            <td className="p-4 align-top">
                              <div className="font-bold text-slate-700">{c.istituto}</div>
                              <div className="text-xs text-slate-500 mb-1">Classe: {c.classe || "-"}</div>
                              {c.ha_fatto_ecg !== null && <div className="text-[10px] mt-1 bg-slate-100 border border-slate-200 text-slate-600 inline-block px-2 py-0.5 rounded font-bold">ECG: <span className={`${c.ha_fatto_ecg ? "text-green-600" : "text-red-600"}`}>{c.ha_fatto_ecg ? "Sì" : "No"}</span></div>}
                            </td>

                            {["In Gestione", "Già Donatori", "Pending"].includes(vistaAttiva) && (
                              <td className="p-4 align-top">
                                {editingId !== c.id && (
                                  <div>
                                    <span className={`px-2.5 py-1 rounded-md font-bold text-xs border inline-block ${c.shift_status === 'Confermato' ? 'bg-green-50 text-green-700 border-green-200' : c.shift_status === 'Contattato' ? 'bg-blue-50 text-blue-700 border-blue-200' : c.shift_status === 'Da Ricontattare' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{c.shift_status}</span>
                                    {c.data_disponibilita && <div className="text-[11px] text-slate-500 mt-2 font-bold flex items-center">Data: {new Date(c.data_disponibilita).toLocaleDateString('it-IT')}</div>}
                                  </div>
                                )}
                              </td>
                            )}

                            <td className="p-4 pr-6 text-right align-top">
                              {["In Gestione", "Già Donatori", "Pending"].includes(vistaAttiva) && editingId !== c.id && (
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
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MODALI (Turni / Ricontatto) */}
          {editingId && ["In Gestione", "Già Donatori", "Pending"].includes(vistaAttiva) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingId(null)}>
              <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-red-500 w-full max-w-sm space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-black text-slate-800 text-lg border-b border-slate-100 pb-2">Gestisci Turno</h3>
                {checkIdoneita(candidature.find(c => c.id === editingId)!).abile ? (
                  <>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-red-500 bg-slate-50">
                      <option value="Da Valutare">⏳ Da Valutare</option>
                      <option value="Contattato">📞 Contattato</option>
                      <option value="Confermato">✅ Confermato</option>
                      <option value="Da Ricontattare">🔄 Da Ricontattare</option>
                    </select>
                    {(editStatus === "Contattato" || editStatus === "Confermato" || editStatus === "Da Valutare") && (
                      <select value={editData} onChange={(e) => setEditData(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 font-medium bg-slate-50">
                        <option value="">-- Seleziona la data --</option>
                        {getSlotDisponibili().map(slot => <option key={slot.date} value={slot.date}>{new Date(slot.date).toLocaleDateString('it-IT')} ({slot.occupati}/4 occupati)</option>)}
                      </select>
                    )}
                    {editStatus === "Da Ricontattare" && (
                      <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Motivazione (es: influenza)..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none outline-none focus:border-red-500 bg-slate-50"></textarea>
                    )}
                  </>
                ) : (<div className="bg-red-50 p-4 text-center text-sm text-red-600 font-bold rounded-lg border border-red-200">Azione bloccata: L'utente non è idoneo per i turni.</div>)}
                <div className="flex space-x-3 pt-2">
                  <button onClick={() => salvaModificheTurno(editingId)} disabled={!checkIdoneita(candidature.find(c => c.id === editingId)!).abile} className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-black shadow-lg disabled:opacity-30 hover:bg-red-700">SALVA</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200">ANNULLA</button>
                </div>
              </div>
            </div>
          )}

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
