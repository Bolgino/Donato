"use client";
import { useState, useEffect, Fragment } from "react";
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
  
  const [loading, setLoading] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [annoAttivo, setAnnoAttivo] = useState<string>("Tutti");
  const [vistaAttiva, setVistaAttivo] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<any>("");
  const [editNote, setEditNote] = useState("");
  const [editData, setEditData] = useState("");
  const [editDataRicontatto, setEditDataRicontatto] = useState("");
  
  const [editScadenzaPensarci, setEditScadenzaPensarci] = useState("");
  const [azionePensarci, setAzionePensarci] = useState("");

  const [azioneDonatore, setAzioneDonatore] = useState("");
  const [expandedTurno, setExpandedTurno] = useState<string | null>(null);
  const [editingProf, setEditingProf] = useState<Partial<Professore> | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
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
          if(anni.length > 0) setAnnoAttivo("Tutti");
      }
    } else toast.error("Errore candidature");

    if (!profRes.error) setProfessori(profRes.data || []);
    setLoading(false);
  };

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

  const getDonatoreStatus = (dataUltimaStr: string | null) => {
    if (!dataUltimaStr) return { isRecent: false, isOld: false };
    const dataUltima = new Date(dataUltimaStr);
    const oggi = new Date();
    
    // Circa 3 mesi
    const sblocco = new Date(dataUltima.getTime() + 90 * 24 * 60 * 60 * 1000);
    const isRecent = sblocco > oggi;

    // Circa 2 anni
    const dueAnniFa = new Date();
    dueAnniFa.setFullYear(oggi.getFullYear() - 2);
    const isOld = dataUltima < dueAnniFa;

    return { isRecent, isOld };
  };

  const anniSet = new Set(candidature.map(c => calcolaAnnoScolastico(c.created_at)));
  const anniDisponibili = ["Tutti", ...Array.from(anniSet)].sort().reverse();
  const datiFiltratiAnno = annoAttivo === "Tutti" ? candidature : candidature.filter(c => calcolaAnnoScolastico(c.created_at) === annoAttivo);

 // IN GESTIONE includerà i nuovi iscritti, quelli da ricontattare e ORA ANCHE gli "In Attesa" (compresi gli ex già donatori)
  const inGestione = datiFiltratiAnno.filter(c => 
    c.shift_status === "In Attesa" || 
    (
      (c.tipo_adesione === "Aspirante" || c.tipo_adesione === "SI" || c.tipo_adesione === "SÌ") && 
      (c.shift_status === "Da Valutare" || c.shift_status === "Da Ricontattare")
    )
  ).sort((a, b) => {
    // Ordiniamo dando priorità agli In Attesa, poi Da Valutare, infine Da Ricontattare
    if (a.shift_status === "In Attesa" && b.shift_status !== "In Attesa") return -1;
    if (a.shift_status !== "In Attesa" && b.shift_status === "In Attesa") return 1;
    if (a.shift_status === "Da Valutare" && b.shift_status === "Da Ricontattare") return -1;
    if (a.shift_status === "Da Ricontattare" && b.shift_status === "Da Valutare") return 1;
    return 0;
  });

  // I GIA' DONATORI rimangono invariati
  const giaDonatori = datiFiltratiAnno.filter(c => 
    c.tipo_adesione === "Già Donatore" && 
    (c.shift_status === "Da Valutare" || c.shift_status === "Da Ricontattare" || !c.shift_status)
  ).sort((a, b) => a.shift_status === "Da Valutare" && b.shift_status === "Da Ricontattare" ? -1 : 1);

  // PENDING ora conterrà SOLO i "Contattato"
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

  const personeDaContattarePensarci = pensarci.filter(c => {
    const dataCreazione = new Date(c.created_at);
    const unMeseFa = new Date();
    unMeseFa.setMonth(unMeseFa.getMonth() - 1);
    return dataCreazione < unMeseFa;
  });

  useEffect(() => {
    if (vistaAttiva === "In Gestione" && inGestione.length > 0) {
      const lastAlert = localStorage.getItem("lastContactAlert");
      const today = new Date().toDateString();
      if (lastAlert !== today) {
        toast.success(`Ci sono ${inGestione.length} nuovi iscritti, ricordati di esportarli in rubrica!`, { icon: '💡', duration: 6000 });
        localStorage.setItem("lastContactAlert", today);
      }
    }
    setSelectedContacts(new Set());
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

  const getStatisticheAnnualiPerScuola = () => {
    const maxVal = Math.max(...scuoleOrdinate.map(s => s[1]), 1);
    const storici: Record<string, Record<string, number>> = {};
    
    candidature.forEach(c => {
      const sc = c.istituto || "Non specificato";
      const an = calcolaAnnoScolastico(c.created_at);
      if(!storici[sc]) storici[sc] = {};
      storici[sc][an] = (storici[sc][an] || 0) + 1;
    });

    return { storici, maxVal };
  };

  const { storici, maxVal } = getStatisticheAnnualiPerScuola();

const esportaGoogleContatti = () => {
    const contattiDaEsportare = datiMostrati.filter(c => selectedContacts.has(c.id));
    if (contattiDaEsportare.length === 0) return toast.error("Seleziona almeno una persona spuntando le caselle.");

    // Intestazione ESATTA basata sul file di esempio
    const header = "Name Prefix;First Name;Middle Name;Last Name;Name Suffix;Phonetic First Name;Phonetic Middle Name;Phonetic Last Name;Nickname;E-mail 1 - Label;E-mail 1 - Value;Phone 1 - Label;Phone 1 - Value;Address 1 - Label;Address 1 - Country;Address 1 - Street;Address 1 - Extended Address;Address 1 - City;Address 1 - Region;Address 1 - Postal Code;Address 1 - PO Box;Organization Name;Organization Title;Organization Department;Birthday;Event 1 - Label;Event 1 - Value;Relation 1 - Label;Relation 1 - Value;Website 1 - Label;Website 1 - Value;Custom Field 1 - Label;Custom Field 1 - Value;Notes;Labels";
    
    const rows = contattiDaEsportare.map(c => {
       // Rimuoviamo i punti e virgola dai campi per evitare che "rompano" l'incolonnamento
       const nome = c.nome ? c.nome.replace(/;/g, ' ') : "";
       const cognome = c.cognome ? c.cognome.replace(/;/g, ' ') : "";
       const telefono = c.cellulare ? c.cellulare.replace(/\D/g,'') : "";
       const email = c.email ? c.email.replace(/;/g, ' ') : "";
       const scuola = c.istituto ? c.istituto.replace(/;/g, ' ') : "";
       const classe = c.classe ? c.classe.replace(/;/g, ' ') : "";
       const note = `Scuola: ${scuola} - Classe: ${classe}`;

       // Ricostruiamo la riga inserendo i dati nei campi corretti separati da ;
       return `;${nome};;${cognome};;;;;;;${email};;${telefono};;;;;;;;;;;;;;;;;;;;${note};`;
    }).join("\r\n");
    
    // Aggiungiamo BOM per la corretta lettura in Excel
    const csvContent = "\uFEFF" + header + "\r\n" + rows;
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

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedContacts(newSet);
  };
  const toggleAll = () => {
    if (selectedContacts.size === datiMostrati.length) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(datiMostrati.map(c => c.id)));
  };

  const salvaModificheTurno = async (id: string) => {
    if ((editStatus === "Contattato" || editStatus === "Confermato") && !editData) {
      toast.error("Devi obbligatoriamente selezionare una data per questo stato!");
      return;
    }

    const salvataggio = toast.loading("Salvataggio in corso...");
    const payload: any = { 
      shift_status: editStatus, 
      note_ricontatto: editNote, 
      data_disponibilita: editData || null 
    };
    if (editStatus === "Da Ricontattare") {
      payload.data_ricontatto = editDataRicontatto || null;
    } else {
      payload.data_ricontatto = null; 
    }

    const { error } = await supabase.from('candidature').update(payload).eq('id', id);
    if (!error) { toast.success("Turno aggiornato", { id: salvataggio }); setEditingId(null); fetchData(); } 
    else toast.error("Errore: " + error.message, { id: salvataggio });
  };

  const gestisciAdesioniSpeciali = async (id: string, azione: string) => {
    const loadToast = toast.loading("Aggiornamento stato...");
    let payload: any = {};

    if (azione === 'PENSARCI_SCADENZA') {
      payload = { scadenza_risposta: editScadenzaPensarci || null };
    } else if (azione === 'PENSARCI_PARTECIPA') {
      payload = { tipo_adesione: 'Aspirante', shift_status: 'In Attesa', scadenza_risposta: null };
    } else if (azione === 'PENSARCI_NO' || azione === 'DONATORE_NO') {
      payload = { tipo_adesione: 'No', shift_status: 'Da Valutare', scadenza_risposta: null };
    } else if (azione === 'DONATORE_ATTESA') {
      const candidato = candidature.find(c => c.id === id);
      const dStatus = getDonatoreStatus(candidato?.data_ultima_donazione || null);
      if (dStatus.isOld) {
        payload = { shift_status: 'In Attesa', tipo_adesione: 'Aspirante' }; // Diventa aspirante se > 2 anni
      } else {
        payload = { shift_status: 'In Attesa' };
      }
    }

    const { error } = await supabase.from('candidature').update(payload).eq('id', id);
    if (!error) { 
      toast.success("Stato aggiornato!", { id: loadToast }); 
      setEditingId(null); 
      fetchData(); 
    } else {
      toast.error("Errore! " + error.message, { id: loadToast });
    }
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

  const getBadgeArchivio = (tipo: string) => {
    if (tipo === "SÌ" || tipo === "SI" || tipo === "Aspirante") return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Sì / Aspirante</span>;
    if (tipo === "Già Donatore") return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Già Donatore</span>;
    if (tipo === "Voglio pensarci") return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Ci Pensa</span>;
    if (tipo === "NO" || tipo === "No") return <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">NO (Rifiutato)</span>;
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
          
          {/* DASHBOARD */}
          {vistaAttiva === "Dashboard" && (
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl shrink-0">👥</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 font-semibold">Totale Iscritti</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-slate-800">{datiFiltratiAnno.length}</p>
                      {annoAttivo === "Tutti" && (
                        <div className="flex items-end space-x-1 h-8 opacity-60">
                           {Object.values(storici).map((scuolaData, i) => {
                             const tot = Object.values(scuolaData).reduce((a,b)=>a+b,0);
                             return <div key={i} className="w-2 bg-blue-400 rounded-t-sm" style={{height: `${(tot/maxVal)*100}%`}}></div>
                           })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl shrink-0">✅</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 font-semibold">Pronti e Assegnati</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-slate-800">{turniConfermati.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-xl shrink-0">⏳</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 font-semibold">Da Gestire / Pending</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-slate-800">{inGestione.length + pending.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* L'Albero / Funnel */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 hidden md:block">
                <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🌳</span> Flusso Smistamento</h3>
                <div className="flex flex-col items-center">
                  <div className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-md z-10 w-64 text-center border-b-4 border-slate-900">
                    Sì / Aspiranti ({inGestione.length + pending.length + turniConfermati.length})
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
                      <div className="w-16 h-16 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center text-xl font-black text-slate-600 mb-3 shadow-sm">{inGestione.filter(c => c.shift_status === "Da Valutare").length}</div>
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
                      <div className="w-16 h-16 rounded-full bg-yellow-50 border-4 border-yellow-200 flex items-center justify-center text-xl font-black text-yellow-600 mb-3 shadow-sm">{inGestione.filter(c => c.shift_status === "Da Ricontattare").length}</div>
                      <span className="text-sm font-bold text-yellow-700 text-center">Da Ricontattare</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistiche e Istogrammi Scuole */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><span className="bg-slate-100 p-2 rounded-lg mr-3">🏫</span> Rendimento Scuole {annoAttivo === "Tutti" ? "(Storico)" : `(${annoAttivo})`}</h3>
                
                {annoAttivo === "Tutti" ? (
                   <div className="space-y-6">
                      {scuoleOrdinate.map(([scuola, totaleRecord]) => {
                         const anniScuola = storici[scuola] || {};
                         const anniOrdinati = Object.keys(anniScuola).sort().reverse();
                         const maxValScuola = Math.max(...Object.values(anniScuola), 1);
                         
                         return (
                           <div key={scuola} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                             <div className="flex justify-between items-end mb-2">
                               <span className="font-bold text-slate-800">{scuola}</span>
                               <span className="text-xs font-black bg-slate-100 text-slate-600 px-2 py-1 rounded">Totale Storico: {totaleRecord}</span>
                             </div>
                             <div className="flex space-x-2 items-end h-16 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {anniOrdinati.map(anno => {
                                  const val = anniScuola[anno];
                                  const heightPerc = (val / maxValScuola) * 100;
                                  return (
                                    <div key={anno} className="flex flex-col items-center w-12 group">
                                      <div className="w-full bg-red-500 rounded-t-sm transition-all duration-300 group-hover:bg-red-600 relative flex items-start justify-center" style={{ height: `${heightPerc}%`, minHeight: '4px' }}>
                                         <span className="text-[10px] font-black text-white mt-1 opacity-0 group-hover:opacity-100">{val}</span>
                                      </div>
                                      <span className="text-[9px] text-slate-500 mt-1 truncate w-full text-center">{anno}</span>
                                    </div>
                                  )
                                })}
                             </div>
                           </div>
                         )
                      })}
                   </div>
                ) : (
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
                )}
              </div>
            </div>
          )}

          {/* VISITE CONFERMATE */}
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
                            
                            <div className="mt-1 mb-2">
                              {p.tipo_adesione === 'Già Donatore' ? (
                                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">🩸 Già Donatore</span>
                              ) : (
                                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">🌱 Aspirante</span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mb-1 mt-1">
                              <strong>Nato:</strong> {p.data_nascita ? new Date(p.data_nascita).toLocaleDateString('it-IT') : 'N/D'}
                              {p.sesso ? ` (${p.sesso})` : ''}
                            </p>
                            
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.ha_fatto_ecg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>ECG: {p.ha_fatto_ecg ? "Sì" : "No"}</span>
                            <p className="text-xs text-slate-500 mt-2 mb-2">{p.istituto}</p>
                            
                            {/* CONTATTI RIORDINATI QUI */}
                            <div className="flex flex-col space-y-2 mt-2 mb-4 border-t border-slate-200 pt-2">
                              <span className="text-[12px] font-bold text-slate-700 flex items-center"><span className="mr-1 text-base">📱</span> {p.cellulare}</span>
                              <span className="text-[12px] font-medium text-slate-600 truncate flex items-center mt-1" title={p.email}><span className="mr-1 text-base">✉️</span> {p.email}</span>
                              
                              <div className="flex space-x-2 pt-1">
                                <a href={`https://wa.me/39${p.cellulare.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-black uppercase text-center hover:bg-green-200 transition-colors">WhatsApp</a>
                                {p.email && <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${p.email}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-200 text-slate-700 border border-slate-300 px-2 py-1 rounded text-[10px] font-black uppercase text-center hover:bg-slate-300 transition-colors">Gmail</a>}
                              </div>
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

          {/* TABELLE COMUNI */}
          {["In Gestione", "Già Donatori", "Pending", "Ci voglio pensare", "Archivio"].includes(vistaAttiva) && (
            <div className="space-y-4">
              
              {/* Alert Già Donatori */}
              {vistaAttiva === "Già Donatori" && datiMostrati.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex items-start space-x-3 mb-4">
                   <span className="text-2xl">🩸</span>
                   <div>
                     <h4 className="font-bold text-blue-800">Attenzione: Sono già donatori attivi!</h4>
                     <p className="text-sm text-blue-600">Queste persone donano già presso il centro trasfusionale. Verifica le loro posizioni e gestiscile di conseguenza (se richiedono informazioni o altro).</p>
                   </div>
                </div>
              )}

              {/* Alert Pensarci 1 Mese */}
              {vistaAttiva === "Ci voglio pensare" && personeDaContattarePensarci.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg flex items-start space-x-3 mb-4">
                   <span className="text-2xl">⏳</span>
                   <div>
                     <h4 className="font-bold text-yellow-800">Ci sono persone in attesa da più di un mese!</h4>
                     <p className="text-sm text-yellow-700">Ricordati di inviare loro una mail e di impostare una data di scadenza per la risposta.</p>
                   </div>
                </div>
              )}

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
                          {vistaAttiva === "In Gestione" && (
                            <th className="p-4 w-12 text-center border-r border-slate-100">
                              <input type="checkbox" onChange={toggleAll} checked={selectedContacts.size === datiMostrati.length && datiMostrati.length > 0} className="w-4 h-4 accent-red-600 rounded cursor-pointer" />
                            </th>
                          )}
                          <th className={`p-4 font-bold ${vistaAttiva !== "In Gestione" ? "pl-6" : ""}`}>Profilo</th>
                          <th className="p-4 font-bold">Contatti</th>
                          <th className="p-4 font-bold">Scuola & Medica</th>
                          {["In Gestione", "Già Donatori", "Pending", "Ci voglio pensare"].includes(vistaAttiva) && <th className="p-4 font-bold">Stato Turno</th>}
                          {vistaAttiva !== "Archivio" ? <th className="p-4 font-bold pr-6 text-right">Azioni</th> : <th className="p-4 font-bold pr-6 text-right text-red-500">Zona Pericolo</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {(() => {
                          let currentGroupDate = "";

                          return datiMostrati.map((c) => {
                            const statoIdoneita = checkIdoneita(c);
                            const dStatus = getDonatoreStatus(c.data_ultima_donazione);
                            
                            const dataCreazione = new Date(c.created_at);
                            const unMeseFa = new Date();
                            unMeseFa.setMonth(unMeseFa.getMonth() - 1);
                            const eVecchioDiUnMese = vistaAttiva === "Ci voglio pensare" && dataCreazione < unMeseFa;

                            const ricontattabileDa = c.data_ricontatto ? new Date(c.data_ricontatto) : null;
                            const oggi = new Date();
                            const ancoraInPausa = ricontattabileDa && ricontattabileDa > oggi;

                            const isRicontattare = c.shift_status === 'Da Ricontattare';
                            const shouldFade = isRicontattare && vistaAttiva === "In Gestione";

                            // LOGICA SEPARATORE DATA PER LA TABELLA PENDING
                            const dataC = c.data_disponibilita || "Senza Data";
                            const showHeader = vistaAttiva === "Pending" && dataC !== currentGroupDate;
                            if (showHeader) currentGroupDate = dataC;

                            return (
                              <Fragment key={c.id}>
                                {/* INTESTAZIONE DATA (mostrata solo in Pending quando cambia la data) */}
                                {showHeader && (
                                  <tr className="bg-blue-50/90 border-y border-blue-200 shadow-sm">
                                    <td colSpan={5} className="px-6 py-3 font-black text-blue-800 text-xs tracking-wider uppercase">
                                      📅 IN ATTESA PER: {dataC !== "Senza Data" ? new Date(dataC).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "DATA DA DEFINIRE"}
                                    </td>
                                  </tr>
                                )}

                                <tr className={`group ${shouldFade ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50/50'} ${eVecchioDiUnMese ? 'bg-red-50/30' : ''}`}>
                                  
                                  {vistaAttiva === "In Gestione" && (
                                    <td className="p-4 text-center border-r border-slate-100 align-top pt-5">
                                      <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={() => toggleSelection(c.id)} className="w-4 h-4 accent-red-600 rounded cursor-pointer" />
                                    </td>
                                  )}

                                  <td className={`p-4 align-top ${vistaAttiva !== "In Gestione" ? "pl-6" : ""}`}>
                                    <div className={`text-xs font-medium mb-1 ${eVecchioDiUnMese ? 'text-red-600 font-bold px-1 bg-red-100 inline-block rounded' : 'text-slate-400'}`}>
                                      {eVecchioDiUnMese && '⚠️ '} {dataCreazione.toLocaleDateString('it-IT')}
                                    </div>
                                    <div className={`font-extrabold text-base flex flex-col items-start ${statoIdoneita.color}`}>
                                      <span>{c.nome} {c.cognome}</span>
                                      
                                      <span className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                        {c.data_nascita ? new Date(c.data_nascita).toLocaleDateString('it-IT') : 'Data N/D'}
                                        {c.sesso ? ` • ${c.sesso}` : ''}
                                      </span>

                                      {!statoIdoneita.abile && <span className="mt-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{statoIdoneita.motivo}</span>}
                                    </div>
                                    
                                    <div className="mt-1.5 mb-1">
                                      {c.tipo_adesione === 'Già Donatore' ? (
                                        <span className="text-[10px] uppercase font-black tracking-wider inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">🩸 Già Donatore</span>
                                      ) : c.tipo_adesione === 'Aspirante' || c.tipo_adesione === 'SÌ' || c.tipo_adesione === 'SI' ? (
                                        <span className="text-[10px] uppercase font-black tracking-wider inline-block px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200">🌱 Aspirante</span>
                                      ) : (
                                        <span className="text-[10px] uppercase font-bold tracking-wider inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600">{c.tipo_adesione}</span>
                                      )}
                                    </div>

                                    {vistaAttiva === "Archivio" && (
                                       <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col space-y-1 text-[10px] text-slate-500 font-medium">
                                         <span className="flex items-center gap-1">Privacy: {c.consenso_privacy ? '✅' : '❌'}</span>
                                         <span className="flex items-center gap-1">Media: {c.consenso_multimediale ? '✅' : '❌'}</span>
                                       </div>
                                    )}
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
                                    
                                    {(c.note || ((vistaAttiva === "Archivio" || vistaAttiva === "Ci voglio pensare") && c.motivo_scelta)) && (
                                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                                        {c.motivo_scelta && (vistaAttiva === "Archivio" || vistaAttiva === "Ci voglio pensare") && (
                                          <div className="text-[11px] text-slate-600"><strong>Motivazione:</strong> {c.motivo_scelta}</div>
                                        )}
                                        {c.note && (
                                          <div className="text-[11px] text-slate-600 bg-slate-100/80 p-2 rounded italic border border-slate-200 break-words">" {c.note} "</div>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {["In Gestione", "Già Donatori", "Pending", "Ci voglio pensare"].includes(vistaAttiva) && (
                                    <td className="p-4 align-top">
                                      {editingId !== c.id && (
                                        <div>
                                          <span className={`px-2.5 py-1 rounded-md font-bold text-xs border inline-block ${c.shift_status === 'Confermato' ? 'bg-green-50 text-green-700 border-green-200' : (c.shift_status === 'Contattato' || c.shift_status === 'In Attesa') ? 'bg-blue-50 text-blue-700 border-blue-200' : c.shift_status === 'Da Ricontattare' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{c.shift_status || 'Da Valutare'}</span>
                                          
                                          {vistaAttiva === 'Già Donatori' && c.data_ultima_donazione && (
                                            <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
                                               <span className="text-[10px] font-bold text-slate-500">Ultima Donazione: {new Date(c.data_ultima_donazione).toLocaleDateString('it-IT')}</span>
                                               {dStatus.isRecent && <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded border border-red-200 inline-block w-fit">⚠️ Attesa 3 mesi</span>}
                                               {dStatus.isOld && <span className="bg-orange-100 text-orange-700 text-[9px] px-2 py-0.5 rounded border border-orange-200 inline-block w-fit">🔄 Scaduto (&gt;2 anni)</span>}
                                            </div>
                                          )}

                                          {c.data_disponibilita && <div className="text-[11px] text-slate-500 mt-2 font-bold flex items-center">Data Visita: {new Date(c.data_disponibilita).toLocaleDateString('it-IT')}</div>}
                                          {c.scadenza_risposta && <div className="text-[11px] text-red-500 mt-2 font-bold flex items-center">Risposta Entro: {new Date(c.scadenza_risposta).toLocaleDateString('it-IT')}</div>}
                                          
                                          {c.shift_status === 'Da Ricontattare' && c.data_ricontatto && (
                                            <div className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 mt-1.5 rounded inline-block font-bold">
                                              A partire dal: {new Date(c.data_ricontatto).toLocaleDateString('it-IT')}
                                            </div>
                                          )}
                                          {c.shift_status === 'Da Ricontattare' && c.note_ricontatto && (
                                            <div className="text-[10px] text-slate-600 mt-1.5 italic border-l-2 border-yellow-400 pl-1.5">
                                              Motivo: {c.note_ricontatto}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  )}

                                  <td className="p-4 pr-6 text-right align-top">
                                    {vistaAttiva === "In Gestione" && editingId !== c.id && (
                                      <button onClick={() => { setEditingId(c.id); setEditStatus(c.shift_status); setEditNote(c.note_ricontatto || ""); setEditData(c.data_disponibilita || ""); setEditDataRicontatto(c.data_ricontatto || ""); }} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600 shadow-sm whitespace-nowrap">Gestisci Turno</button>
                                    )}

                                    {vistaAttiva === "Pending" && editingId !== c.id && (
                                       <button onClick={() => { setEditingId(c.id); setEditStatus(c.shift_status); setEditNote(c.note_ricontatto || ""); setEditData(c.data_disponibilita || ""); setEditDataRicontatto(c.data_ricontatto || ""); }} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600 shadow-sm whitespace-nowrap">Aggiorna</button>
                                    )}

                                    {vistaAttiva === "Già Donatori" && editingId !== c.id && (
                                      <button onClick={() => { setEditingId(c.id); setAzioneDonatore(""); }} className="bg-blue-600 text-white border border-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm whitespace-nowrap">Gestisci Donatore</button>
                                    )}

                                    {vistaAttiva === "Ci voglio pensare" && editingId !== c.id && (
                                      <button onClick={() => { setEditingId(c.id); setAzionePensarci(""); setEditScadenzaPensarci(c.scadenza_risposta || ""); }} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600 shadow-sm whitespace-nowrap">Gestisci</button>
                                    )}

                                    {vistaAttiva === "Archivio" && (
                                      <button onClick={() => eliminaCandidato(c.id)} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm">Elimina</button>
                                    )}
                                  </td>
                                </tr>
                              </Fragment>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODALI (Turni standard - Gestione/Pending) */}
          {editingId && ["In Gestione", "Pending"].includes(vistaAttiva) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingId(null)}>
              <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-red-500 w-full max-w-sm space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-black text-slate-800 text-lg border-b border-slate-100 pb-2">Gestisci Turno</h3>
                {(() => {
                   const candidato = candidature.find(c => c.id === editingId);
                   const idoneita = checkIdoneita(candidato!);
                   const canSchedule = idoneita.abile; 
                   const ricData = candidato?.data_ricontatto ? new Date(candidato.data_ricontatto) : null;
                   const isInPausa = !!(ricData && ricData > new Date()); 

                   return (
                     <>
                        {!canSchedule && <div className="bg-red-50 p-3 text-center text-xs text-red-600 font-bold rounded-lg border border-red-200">L'utente non è convocabile ({idoneita.motivo}). Puoi comunque metterlo da ricontattare.</div>}
                        
                        <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-red-500 bg-slate-50 mt-2">
                          <option value="Da Valutare">⏳ Da Valutare</option>
                          <option value="Contattato" disabled={isInPausa || !canSchedule}>📞 Contattato {!canSchedule ? '(Non Idoneo)' : isInPausa ? '(In Pausa)' : ''}</option>
                          <option value="Confermato" disabled={isInPausa || !canSchedule}>✅ Confermato {!canSchedule ? '(Non Idoneo)' : isInPausa ? '(In Pausa)' : ''}</option>
                          <option value="Da Ricontattare">🔄 Da Ricontattare</option>
                        </select>

                        {(editStatus === "Contattato" || editStatus === "Confermato" || editStatus === "Da Valutare") && canSchedule && (
                          <select value={editData} onChange={(e) => setEditData(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 font-medium bg-slate-50">
                            <option value="">-- Seleziona data della visita --</option>
                            {getSlotDisponibili().map(slot => <option key={slot.date} value={slot.date}>{new Date(slot.date).toLocaleDateString('it-IT')} ({slot.occupati}/4 occupati)</option>)}
                          </select>
                        )}

                        {editStatus === "Da Ricontattare" && (
                          <>
                            <label className="block text-xs font-bold text-slate-600 mt-2 mb-1">Ricontattabile dal (Opzionale):</label>
                            <input type="date" value={editDataRicontatto} onChange={e => setEditDataRicontatto(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 bg-slate-50 mb-2"/>
                            
                            <label className="block text-xs font-bold text-slate-600 mt-2 mb-1">Motivazione:</label>
                            <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Motivazione (es: influenza, minorenne)..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none outline-none focus:border-red-500 bg-slate-50"></textarea>
                          </>
                        )}
                     </>
                   )
                })()}

                <div className="flex space-x-3 pt-2">
                  <button onClick={() => salvaModificheTurno(editingId)} className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-black shadow-lg hover:bg-red-700">SALVA</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200">ANNULLA</button>
                </div>
              </div>
            </div>
          )}

          {/* MODALE (Ci Voglio Pensare - Gestione Unica) */}
          {editingId && vistaAttiva === "Ci voglio pensare" && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => {setEditingId(null); setAzionePensarci("");}}>
              <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-sm space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                
                <h3 className="font-black text-slate-800 text-lg border-b border-slate-100 pb-2">Gestisci "Ci voglio pensare"</h3>
                <p className="text-xs text-slate-500 mb-2">Scegli se aggiornare la scadenza per la risposta o registrare l'esito finale della persona.</p>
                
                <select value={azionePensarci} onChange={(e) => setAzionePensarci(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-red-500 bg-slate-50">
                  <option value="">-- Seleziona operazione --</option>
                  <option value="PENSARCI_SCADENZA">⏳ Imposta/Aggiorna Scadenza Risposta</option>
                  <option value="PENSARCI_PARTECIPA">✅ Partecipa (Diventa Aspirante e va in Pending)</option>
                  <option value="PENSARCI_NO">❌ Non Interessato (Diventa No e va in Archivio)</option>
                </select>

                {azionePensarci === "PENSARCI_SCADENZA" && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Entro quando deve rispondere?</label>
                    <input type="date" value={editScadenzaPensarci} onChange={e => setEditScadenzaPensarci(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold bg-slate-50" />
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-4">
                  <button onClick={() => gestisciAdesioniSpeciali(editingId, azionePensarci)} disabled={!azionePensarci || (azionePensarci === "PENSARCI_SCADENZA" && !editScadenzaPensarci)} className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-black shadow-lg hover:bg-red-700 disabled:opacity-50 transition-all">Conferma</button>
                  <button onClick={() => {setEditingId(null); setAzionePensarci("");}} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-all">Annulla</button>
                </div>

              </div>
            </div>
          )}

          {/* MODALE (Già Donatori) */}
          {editingId && vistaAttiva === "Già Donatori" && (() => {
             const candidatoEdit = candidature.find(c => c.id === editingId);
             const statusD = getDonatoreStatus(candidatoEdit?.data_ultima_donazione || null);

             return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => {setEditingId(null); setAzioneDonatore("");}}>
                <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-blue-500 w-full max-w-sm space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-black text-slate-800 text-lg border-b border-slate-100 pb-2">Gestisci "Già Donatore"</h3>
                  <p className="text-xs text-slate-500 mb-2">Decidi come spostare l'utente dalle nuove iscrizioni ai listini operativi.</p>
                  <select value={azioneDonatore} onChange={(e) => setAzioneDonatore(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 bg-slate-50">
                    <option value="">-- Scegli azione --</option>
                    <option value="DONATORE_ATTESA" disabled={statusD.isRecent}>
                      ⏳ Segna come Pending {statusD.isRecent ? '(Bloccato < 3 mesi)' : statusD.isOld ? '(Diventa Aspirante)' : ''}
                    </option>
                    <option value="DONATORE_NO">❌ Non possono / Segna come NO (Archivio)</option>
                  </select>
                  
                  <div className="flex space-x-3 pt-4 border-t border-slate-100">
                    <button onClick={() => gestisciAdesioniSpeciali(editingId, azioneDonatore)} disabled={!azioneDonatore} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-black shadow-lg disabled:opacity-40 hover:bg-blue-700">Conferma</button>
                    <button onClick={() => {setEditingId(null); setAzioneDonatore("");}} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200">Annulla</button>
                  </div>
                </div>
              </div>
             );
          })()}

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



