"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [candidature, setCandidature] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [fraseLoading, setFraseLoading] = useState("Verificando gli accessi...");
  const [annoAttivo, setAnnoAttivo] = useState<string>("Tutti");
  const [vistaAttiva, setVistaAttivo] = useState("Dashboard");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editData, setEditData] = useState("");

  const frasiDivertenti = ["Organizzando i turni...", "Smistando le candidature...", "Controllando l'emoglobina..."];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
      else setLoading(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert("Errore: " + error.message); setIsLoggingIn(false); }
    else { fetchData(); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload(); };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('candidature').select('*').order('created_at', { ascending: true });
    if (!error) {
      setCandidature(data || []);
      const anni = Array.from(new Set(data?.map(c => calcolaAnnoScolastico(c.created_at)))).sort().reverse();
      if(anni.length > 0 && annoAttivo === "Tutti") setAnnoAttivo(anni[0] as string);
    }
    setTimeout(() => setLoading(false), 1000);
  };

  const salvaModifiche = async (id: string) => {
    const { error } = await supabase.from('candidature').update({ 
      shift_status: editStatus, 
      note_ricontatto: editNote, 
      data_disponibilita: editData || null 
    }).eq('id', id);
    if (error) alert("Errore nel salvataggio.");
    else { setEditingId(null); fetchData(); }
  };

  // --- LOGICA DATE E TURNI ---
  const calcolaAnnoScolastico = (dataString: string) => {
    const d = new Date(dataString);
    const year = d.getFullYear();
    return d.getMonth() < 8 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
  };

  // Genera i prossimi Martedì e Giovedì (Almeno 5 giorni da oggi)
  const getProssimeDateTurno = () => {
    const date: string[] = [];
    let d = new Date();
    d.setDate(d.getDate() + 5); // Salta i prossimi 5 giorni

    while (date.length < 6) { // Genera 6 opzioni
      if (d.getDay() === 2 || d.getDay() === 4) { // 2 = Martedì, 4 = Giovedì
        date.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return date;
  };

  const datiFiltratiAnno = annoAttivo === "Tutti" ? candidature : candidature.filter(c => calcolaAnnoScolastico(c.created_at) === annoAttivo);
  
  const daSmistare = datiFiltratiAnno.filter(c => c.shift_status === "Da Valutare" && (c.tipo_adesione !== "No" && c.tipo_adesione !== "Voglio pensarci"));
  const inGestione = datiFiltratiAnno.filter(c => ["Confermato", "Contattato", "Da Ricontattare"].includes(c.shift_status));
  const pensarci = datiFiltratiAnno.filter(c => c.tipo_adesione === "Voglio pensarci");
  const archivio = datiFiltratiAnno.filter(c => c.tipo_adesione === "No");

  // Raggruppamento Turni per Data
  const turniRaggruppati = inGestione.reduce((acc: any, c) => {
    const data = c.data_disponibilita || "Senza Data";
    if (!acc[data]) acc[data] = [];
    acc[data].push(c);
    return acc;
  }, {});

  if (!session) return ( /* ... Schermata Login come prima ... */ 
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-2xl text-center w-full max-w-sm">
            <h2 className="text-2xl font-extrabold mb-6">Area Riservata</h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 p-2 border-b-2 outline-none" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-8 p-2 border-b-2 outline-none" />
            <button className="w-full bg-red-600 text-white p-3 rounded-xl font-bold">Accedi</button>
        </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-4">
        <h1 className="text-xl font-bold text-white mb-8 px-4">Donato<span className="text-red-500">.</span></h1>
        <nav className="space-y-2">
          {["Dashboard", "Da Smistare", "In Gestione", "Pensarci", "Archivio"].map(m => (
            <button key={m} onClick={() => setVistaAttivo(m)} className={`w-full text-left px-4 py-3 rounded-xl ${vistaAttiva === m ? 'bg-red-600 text-white' : 'hover:bg-slate-800'}`}>
              {m}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-black">{vistaAttiva}</h2>
          <select value={annoAttivo} onChange={(e) => setAnnoAttivo(e.target.value)} className="bg-slate-100 p-2 rounded-lg font-bold outline-none">
            {["Tutti", ...Array.from(new Set(candidature.map(c => calcolaAnnoScolastico(c.created_at))))].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </header>

        <div className="flex-1 overflow-auto p-8">
          
          {/* DASHBOARD CON STATISTICHE RICHIESTE */}
          {vistaAttiva === "Dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                <p className="text-sm font-bold text-slate-400">TOTALE ISCRITTI</p>
                <p className="text-4xl font-black">{datiFiltratiAnno.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
                <p className="text-sm font-bold text-slate-400">CANDIDATI ATTIVI ("SÌ")</p>
                <p className="text-4xl font-black text-green-600">{daSmistare.length + inGestione.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
                <p className="text-sm font-bold text-slate-400">DUBBIOSI</p>
                <p className="text-4xl font-black text-amber-500">{pensarci.length}</p>
              </div>
            </div>
          )}

          {/* VISTA IN GESTIONE CON SOTTO-SCHEDE TURNI */}
          {vistaAttiva === "In Gestione" && (
            <div className="space-y-8">
              {Object.keys(turniRaggruppati).sort().map(dataTurno => (
                <div key={dataTurno} className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200">
                  <div className="bg-slate-800 p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold">
                      {dataTurno === "Senza Data" ? "⚠️ TURNI DA ASSEGNARE" : `📅 Turno del ${new Date(dataTurno).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                    </h3>
                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">{turniRaggruppati[dataTurno].length} ragazzi</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turniRaggruppati[dataTurno].map((c: any) => (
                      <div key={c.id} className="border p-4 rounded-xl relative group hover:border-red-200 transition-all">
                        <p className="font-bold text-slate-800">{c.nome} {c.cognome}</p>
                        <p className="text-xs text-slate-500">{c.istituto} - {c.cellulare}</p>
                        <div className="mt-3 flex justify-between items-center">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${c.shift_status === 'Confermato' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {c.shift_status}
                            </span>
                            <button onClick={() => { setEditingId(c.id); setEditStatus(c.shift_status); setEditData(c.data_disponibilita || ""); }} className="text-xs text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Modifica</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABELLA GENERALE PER ALTRE VISTE */}
          {["Da Smistare", "Pensarci", "Archivio"].includes(vistaAttiva) && (
            <table className="w-full bg-white rounded-2xl shadow-sm border-collapse overflow-hidden">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 text-left">Ragazzo</th>
                  <th className="p-4 text-left">Scuola</th>
                  <th className="p-4 text-left">Stato Medico</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {datiFiltratiAnno.filter(c => 
                  vistaAttiva === "Da Smistare" ? (c.shift_status === "Da Valutare" && c.tipo_adesione !== "No" && c.tipo_adesione !== "Voglio pensarci") :
                  vistaAttiva === "Pensarci" ? c.tipo_adesione === "Voglio pensarci" :
                  c.tipo_adesione === "No"
                ).map(c => {
                  const eta = c.data_nascita ? Math.floor((new Date().getTime() - new Date(c.data_nascita).getTime()) / 31557600000) : 0;
                  const isMinorenne = eta < 18;
                  // Logica idoneità (90gg dall'ultima donazione)
                  const isIdoneo = !c.data_ultima_donazione || (new Date().getTime() - new Date(c.data_ultima_donazione).getTime() > 90 * 24 * 60 * 60 * 1000);
                  const bloccato = isMinorenne || !isIdoneo;

                  return (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="p-4">
                        <span className={`font-bold ${isMinorenne ? 'text-red-600' : 'text-slate-800'}`}>{c.nome} {c.cognome}</span>
                        {isMinorenne && <span className="block text-[10px] font-black text-red-500 uppercase tracking-tighter">⛔ MINORENNE</span>}
                      </td>
                      <td className="p-4 text-sm text-slate-600">{c.istituto}</td>
                      <td className="p-4">
                        {!isIdoneo ? <span className="text-orange-600 text-xs font-bold">⏳ Sospeso (Periodo finestra)</span> : <span className="text-green-600 text-xs">✔️ Idoneo</span>}
                      </td>
                      <td className="p-4 text-right">
                        {bloccato ? (
                           <span className="text-[10px] text-slate-400 italic">Non assegnabile a turni</span>
                        ) : (
                          <button onClick={() => { setEditingId(c.id); setEditStatus("Contattato"); }} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-red-700">Assegna Turno</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MODALE DI GESTIONE TURNO (SLOT) */}
        {editingId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
              <h3 className="text-xl font-black mb-6">Gestione Slot Donazione</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Seleziona Data (Mar/Gio disponibili)</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {getProssimeDateTurno().map(date => (
                      <button key={date} onClick={() => setEditData(date)} className={`p-2 text-xs rounded-lg border-2 font-bold transition-all ${editData === date ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-100 hover:border-slate-200'}`}>
                        {new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Esito Chiamata / Stato</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border-none outline-none font-bold">
                    <option value="Contattato">📞 Solo Contattato</option>
                    <option value="Confermato">✅ Turno Confermato</option>
                    <option value="Da Ricontattare">🔄 Da Ricontattare</option>
                    <option value="Da Valutare">⏳ Riporta in lista</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button onClick={() => salvaModifiche(editingId)} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg">Salva Turno</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold">Annulla</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
