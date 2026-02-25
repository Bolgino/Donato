"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [sezione, setSezione] = useState<number>(1);
  const [tipoAdesione, setTipoAdesione] = useState("");
  const [inviato, setInviato] = useState(false);
  const [loading, setLoading] = useState(false);

  const [motiviSelezionati, setMotiviSelezionati] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    nome: "", cognome: "", classe: "", istituto: "", istitutoAltro: "",
    data_nascita: "", ha_fatto_ecg: "", cellulare: "", email: "",
    data_ultima_donazione: "", motivo_sceltaAltro: "", 
    sei: "", seiAltro: "", note: "", consenso_privacy: false, consenso_multimediale: false
  });

  const scuole = [
    "Liceo G. Dal Piaz",
    "ITIS Negrelli e Forcellini",
    "ITE Colotti",
    "IPSIA RIzzarda",
    "Istituto Canossiano",
    "IIS della Lucia",
    "Università",
    "Enaip",
    "ICS Primiero",
    "Altro"
  ];

  const motivi = [
    "Non posso donare per motivi di salute",
    "Ho paura delle punture/sangue",
    "Non posso donare per motivi legati alla religione",
    "Ho paura che la visita/donazione possa danneggiare la mia salute",
    "Mi state antipatici",
    "Non ho compreso il progetto e le info esposte durante la presentazione",
    "Ho paura che la donazione possa danneggiare le mie prestazioni fisiche/intellettuali",
    "Non ho tempo",
    "Nelle mie vene non scorre sangue XD",
    "Devo informarmi sulle mie condizioni di salute",
    "Voglio andare in centro Trasfusionale da solo",
    "Mi è scivolato il dito sul NO per sbaglio (P.S. puoi sempre tornare indietro e cambiare risposta :-))"
  ];

  const handleScelta = (scelta: string) => {
    setTipoAdesione(scelta);
    if (scelta === "Sì_Nuovo") setSezione(2);
    else if (scelta === "Sì_Donatore") setSezione(3);
    else if (scelta === "Pensarci") setSezione(4);
    else if (scelta === "No") setSezione(5);
  };

  const handleMotivoChange = (motivo: string, isChecked: boolean) => {
    if (isChecked) {
      setMotiviSelezionati([...motiviSelezionati, motivo]);
    } else {
      setMotiviSelezionati(motiviSelezionati.filter(m => m !== motivo));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const istitutoFinale = formData.istituto === "Altro" ? formData.istitutoAltro : formData.istituto;
    const seiFinale = formData.sei === "Altro" ? formData.seiAltro : formData.sei;
    
    let motiviFinaliList = [...motiviSelezionati];
    if (motiviFinaliList.includes("Altro") && formData.motivo_sceltaAltro) {
      motiviFinaliList = motiviFinaliList.filter(m => m !== "Altro");
      motiviFinaliList.push(formData.motivo_sceltaAltro);
    }
    const motiviUniti = motiviFinaliList.join(", ");

    const adesioneDb = tipoAdesione === "Sì_Nuovo" ? "Aspirante" : tipoAdesione === "Sì_Donatore" ? "Già Donatore" : tipoAdesione === "Pensarci" ? "Voglio pensarci" : "No";
    const questionarioFinale = [motiviUniti, seiFinale].filter(Boolean).join(" | Sei: ");

    // TRADUZIONE ECG DA TESTO A BOOLEANO PER SUPABASE
    let ecgBooleano = null;
    if (formData.ha_fatto_ecg === "Sì") ecgBooleano = true;
    if (formData.ha_fatto_ecg === "No") ecgBooleano = false;

    const { error } = await supabase.from('candidature').insert([{ 
      tipo_adesione: adesioneDb,
      nome: formData.nome || "N/A",
      cognome: formData.cognome || "N/A",
      classe: formData.classe,
      istituto: istitutoFinale,
      data_nascita: formData.data_nascita || null,
      ha_fatto_ecg: ecgBooleano, // <-- Usiamo la variabile convertita!
      cellulare: formData.cellulare || "N/A",
      email: formData.email || "N/A",
      data_ultima_donazione: formData.data_ultima_donazione || null,
      motivo_scelta: questionarioFinale, 
      note: formData.note,
      consenso_privacy: formData.consenso_privacy,
      consenso_multimediale: formData.consenso_multimediale
    }]);

    setLoading(false);
    if (error) alert("C'è stato un errore: " + error.message);
    else setInviato(true);
  };

  if (inviato) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 p-4 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border-t-8 border-red-600 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Modulo Inviato!</h2>
          <p className="text-gray-600">Grazie per aver dedicato del tempo per compilare la tua pre-adesione.</p>
        </div>
      </div>
    );
  }

  // Stili riutilizzabili per un look pulito
  const inputStyle = "w-full border-b-2 border-gray-200 focus:border-red-600 focus:ring-0 outline-none pb-2 bg-transparent transition-colors text-gray-800 font-medium placeholder-gray-400";
  const labelStyle = "block mb-2 text-sm font-semibold text-gray-600 uppercase tracking-wide";
  const cardOptionStyle = "flex items-center space-x-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-red-50 hover:border-red-200 transition-all duration-200 shadow-sm hover:shadow-md bg-white";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-200 py-10 px-4 font-sans text-gray-800 selection:bg-red-200">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 border-red-600">
        
        {/* INTESTAZIONE COMUNE */}
        <div className="p-8 md:p-10 border-b border-gray-100 bg-white">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-3 h-8 bg-red-600 rounded-full"></div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Progetto Scuole -Giovani Donatori Feltre</h1>
          </div>
          <h2 className="text-xl font-medium text-gray-500 mb-4">Modulo pre-adesione per aspiranti donatori</h2>
          <p className="text-sm text-gray-600 leading-relaxed bg-blue-50 p-4 rounded-xl border border-blue-100">
            In caso di risposta affermativa, ti contatteremo a breve per comunicarti la data dell'uscita e per fornirti tutte le info per una donazione consapevole.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-10 bg-[#fafcff]">
          
          {/* SEZIONE 1: La Scelta */}
          {sezione === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="mb-5 text-lg font-medium text-gray-800">Come desideri procedere? Scegli un'opzione:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={cardOptionStyle}>
                  <input type="radio" name="adesione" onChange={() => handleScelta("Sì_Nuovo")} className="w-5 h-5 accent-red-600" />
                  <span className="font-medium">Sì, voglio aderire <br/><span className="text-xs text-gray-500 font-normal">(Nuovo aspirante)</span></span>
                </label>
                <label className={cardOptionStyle}>
                  <input type="radio" name="adesione" onChange={() => handleScelta("Sì_Donatore")} className="w-5 h-5 accent-red-600" />
                  <span className="font-medium">Sì, aderisco <br/><span className="text-xs text-gray-500 font-normal">(Già donatore / idoneo)</span></span>
                </label>
                <label className={cardOptionStyle}>
                  <input type="radio" name="adesione" onChange={() => handleScelta("Pensarci")} className="w-5 h-5 accent-red-600" />
                  <span className="font-medium">Voglio pensarci <br/><span className="text-xs text-gray-500 font-normal">(Prima di aderire)</span></span>
                </label>
                <label className={cardOptionStyle}>
                  <input type="radio" name="adesione" onChange={() => handleScelta("No")} className="w-5 h-5 accent-red-600" />
                  <span className="font-medium">No, grazie</span>
                </label>
              </div>
            </div>
          )}

          {/* SEZIONE 2: Nuovo Aspirante */}
          {sezione === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                <h2 className="text-2xl font-bold text-red-800 mb-2">Adesione al progetto Scuole</h2>
                <p className="text-sm text-red-600/80">I dati inseriti ci servono al solo scopo di potervi contattare, prenotare la visita presso il centro trasfusionale e inviare info riguardanti la donazione.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <div><label className={labelStyle}>Nome *</label><input type="text" required onChange={(e) => setFormData({...formData, nome: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Cognome *</label><input type="text" required onChange={(e) => setFormData({...formData, cognome: e.target.value})} className={inputStyle} /></div>
                
                <div className="md:col-span-2">
                  <label className={labelStyle}>Istituto *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {scuole.map(scuola => (
                      <label key={scuola} className={cardOptionStyle}>
                        <input type="radio" name="istituto" value={scuola} required onChange={(e) => setFormData({...formData, istituto: e.target.value})} className="w-5 h-5 accent-red-600" />
                        <span className="text-sm">{scuola}</span>
                      </label>
                    ))}
                  </div>
                  {formData.istituto === "Altro" && (
                    <input type="text" placeholder="Specifica l'istituto..." required onChange={(e) => setFormData({...formData, istitutoAltro: e.target.value})} className={`mt-4 ${inputStyle}`} />
                  )}
                </div>

                <div><label className={labelStyle}>Classe *</label><input type="text" placeholder="Es: 5A" required onChange={(e) => setFormData({...formData, classe: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Data di nascita *</label><input type="date" required onChange={(e) => setFormData({...formData, data_nascita: e.target.value})} className={inputStyle} /></div>
                
                <div className="md:col-span-2">
                  <label className={labelStyle}>Hai fatto da meno di 2 anni l'ECG (elettrocardiogramma)?</label>
                  <div className="flex space-x-6 mt-3">
                    <label className={cardOptionStyle + " w-full justify-center"}><input type="radio" name="ecg" value="Sì" onChange={(e) => setFormData({...formData, ha_fatto_ecg: e.target.value})} className="w-5 h-5 accent-red-600" /><span className="font-medium">Sì</span></label>
                    <label className={cardOptionStyle + " w-full justify-center"}><input type="radio" name="ecg" value="No" onChange={(e) => setFormData({...formData, ha_fatto_ecg: e.target.value})} className="w-5 h-5 accent-red-600" /><span className="font-medium">No</span></label>
                  </div>
                </div>

                <div><label className={labelStyle}>Cellulare *</label><input type="tel" required onChange={(e) => setFormData({...formData, cellulare: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Email (Personale, no scolastica) *</label><input type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} className={inputStyle} /></div>
              </div>
            </div>
          )}

          {/* SEZIONE 3: Già donatore */}
          {sezione === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
               <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                <h2 className="text-2xl font-bold text-red-800 mb-2">Adesione come Già Donatore</h2>
                <p className="text-sm text-red-600/80">Bentornato! I dati ci servono per potervi contattare e prenotare la visita presso il centro trasfusionale.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <div><label className={labelStyle}>Nome *</label><input type="text" required onChange={(e) => setFormData({...formData, nome: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Cognome *</label><input type="text" required onChange={(e) => setFormData({...formData, cognome: e.target.value})} className={inputStyle} /></div>
                
                <div className="md:col-span-2">
                  <label className={labelStyle}>Ultima donazione/visita di idoneità *</label>
                  <p className="text-xs text-gray-500 mb-3">(Ricorda: puoi donare dopo 3 mesi dall'ultima donazione e dopo 1 mese dalla prima visita)</p>
                  <input type="date" required onChange={(e) => setFormData({...formData, data_ultima_donazione: e.target.value})} className={inputStyle} />
                </div>
                
                <div className="md:col-span-2">
                  <label className={labelStyle}>Istituto *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {scuole.map(scuola => (
                      <label key={scuola} className={cardOptionStyle}>
                        <input type="radio" name="istituto" value={scuola} required onChange={(e) => setFormData({...formData, istituto: e.target.value})} className="w-5 h-5 accent-red-600" />
                        <span className="text-sm">{scuola}</span>
                      </label>
                    ))}
                  </div>
                  {formData.istituto === "Altro" && <input type="text" placeholder="Specifica istituto..." required onChange={(e) => setFormData({...formData, istitutoAltro: e.target.value})} className={`mt-4 ${inputStyle}`} />}
                </div>

                <div><label className={labelStyle}>Classe</label><input type="text" placeholder="Es: 5A" onChange={(e) => setFormData({...formData, classe: e.target.value})} className={inputStyle} /></div>
                
                <div><label className={labelStyle}>Cellulare *</label><input type="tel" required onChange={(e) => setFormData({...formData, cellulare: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Email (Personale) *</label><input type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} className={inputStyle} /></div>
              </div>
            </div>
          )}

          {/* SEZIONE 4: Voglio pensarci */}
          {sezione === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
               <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <h2 className="text-2xl font-bold text-amber-800 mb-2">Prenditi il tuo tempo</h2>
                <p className="text-sm text-amber-700/80">Ti contatteremo per darti info utili e chiarire i tuoi dubbi. Seguici su IG <a href="https://instagram.com/Giovani_Donatori_Feltre" target="_blank" className="font-bold underline">Giovani_Donatori_Feltre</a>!</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <div><label className={labelStyle}>Nome *</label><input type="text" required onChange={(e) => setFormData({...formData, nome: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Cognome *</label><input type="text" required onChange={(e) => setFormData({...formData, cognome: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Quando sei nato?</label><input type="date" onChange={(e) => setFormData({...formData, data_nascita: e.target.value})} className={inputStyle} /></div>
                
                <div className="md:col-span-2">
                  <label className={labelStyle}>Istituto *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {scuole.map(scuola => (
                      <label key={scuola} className={cardOptionStyle}>
                        <input type="radio" name="istituto" value={scuola} required onChange={(e) => setFormData({...formData, istituto: e.target.value})} className="w-5 h-5 accent-red-600" />
                        <span className="text-sm">{scuola}</span>
                      </label>
                    ))}
                  </div>
                  {formData.istituto === "Altro" && <input type="text" placeholder="Specifica istituto..." required onChange={(e) => setFormData({...formData, istitutoAltro: e.target.value})} className={`mt-4 ${inputStyle}`} />}
                </div>

                <div><label className={labelStyle}>Classe</label><input type="text" placeholder="Es: 5A" onChange={(e) => setFormData({...formData, classe: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Cellulare *</label><input type="tel" required onChange={(e) => setFormData({...formData, cellulare: e.target.value})} className={inputStyle} /></div>
                <div><label className={labelStyle}>Email (Personale) *</label><input type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} className={inputStyle} /></div>
              </div>
            </div>
          )}

          {/* SEZIONE 5: Questionario NO / Pensarci */}
          {(sezione === 4 || sezione === 5) && (
            <div className="space-y-8 mt-10 pt-10 border-t border-gray-200 animate-in fade-in slide-in-from-right-8 duration-500 delay-150">
              <div className="bg-slate-100 p-5 rounded-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Questionario Conoscitivo</h2>
                <p className="text-sm text-slate-600">Le risposte che ci invierete saranno utili al nostro gruppo per migliorare il progetto. Grazie!</p>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className={labelStyle}>Perché hai risposto NO / Voglio pensarci? *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {motivi.map((motivo) => (
                      <label key={motivo} className={cardOptionStyle}>
                        <input type="checkbox" value={motivo} onChange={(e) => handleMotivoChange(motivo, e.target.checked)} className="w-5 h-5 accent-red-600 rounded" />
                        <span className="text-sm leading-tight">{motivo}</span>
                      </label>
                    ))}
                    <label className={cardOptionStyle}>
                      <input type="checkbox" value="Altro" onChange={(e) => handleMotivoChange("Altro", e.target.checked)} className="w-5 h-5 accent-red-600 rounded" />
                      <span className="text-sm font-medium">Altro (specifica)</span>
                    </label>
                  </div>
                  {motiviSelezionati.includes("Altro") && (
                    <input type="text" required placeholder="Scrivi il motivo..." onChange={(e) => setFormData({...formData, motivo_sceltaAltro: e.target.value})} className={`mt-4 ${inputStyle}`} />
                  )}
                </div>
                
                <div>
                  <label className={labelStyle}>Sesso</label>
                  {/* MODIFICA: flex-wrap e gap ridotto per impedire tagli su schermi piccoli */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {["Maschio", "Femmina", "Altro"].map((opzione) => (
                      <label key={opzione} className={cardOptionStyle + " flex-1 min-w-[100px] justify-center"}>
                        <input type="radio" name="sei" value={opzione} onChange={(e) => setFormData({...formData, sei: e.target.value})} className="w-5 h-5 accent-red-600" />
                        <span className="font-medium text-sm sm:text-base">{opzione}</span>
                      </label>
                    ))}
                  </div>
                  {formData.sei === "Altro" && <input type="text" placeholder="Specifica..." onChange={(e) => setFormData({...formData, seiAltro: e.target.value})} className={`mt-4 ${inputStyle}`} />}
                </div>

                {sezione === 5 && (
                  <div>
                    <label className={labelStyle}>Istituto *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {scuole.map(scuola => (
                        <label key={scuola} className={cardOptionStyle}>
                          <input type="radio" name="istituto" value={scuola} required onChange={(e) => setFormData({...formData, istituto: e.target.value})} className="w-5 h-5 accent-red-600" />
                          <span className="text-sm">{scuola}</span>
                        </label>
                      ))}
                    </div>
                    {formData.istituto === "Altro" && <input type="text" placeholder="Specifica istituto..." required onChange={(e) => setFormData({...formData, istitutoAltro: e.target.value})} className={`mt-4 ${inputStyle}`} />}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BLOCCO PRIVACY, MULTIMEDIALE E INVIO */}
          {sezione !== 1 && (
            <div className="mt-10 pt-8 border-t border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              
              <div className="mb-8">
                <label className={labelStyle}>Inserisci qui eventuali note/commenti</label>
                <input type="text" placeholder="Scrivi qui..." onChange={(e) => setFormData({...formData, note: e.target.value})} className={inputStyle} />
              </div>
              
              <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <label className="flex items-start space-x-4 cursor-pointer group">
                  <input type="checkbox" required onChange={(e) => setFormData({...formData, consenso_privacy: e.target.checked})} className="mt-1 w-5 h-5 accent-red-600 rounded border-gray-300" />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    Autorizzo al trattamento dei miei dati personali, secondo l'informativa disponibile su <a href="https://sites.google.com/view/gruppogiovani-fidasfeltre" target="_blank" className="text-blue-600 font-semibold hover:underline">Fidas Feltre</a> *
                  </span>
                </label>

                <label className="flex items-start space-x-4 cursor-pointer group">
                  <input type="checkbox" onChange={(e) => setFormData({...formData, consenso_multimediale: e.target.checked})} className="mt-1 w-5 h-5 accent-red-600 rounded border-gray-300" />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    Autorizzo l'utilizzo di eventuale materiale fotografico e/o riprese video per le finalità dell'associazione (sito web, social, volantini).
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between items-center mt-8 gap-4">
                <button type="button" onClick={() => setSezione(1)} className="w-full sm:w-auto px-6 py-3 text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-xl transition-all">
                  Torna indietro
                </button>
                <button disabled={loading || (sezione >= 4 && motiviSelezionati.length === 0)} type="submit" className="w-full sm:w-auto bg-red-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none">
                  {loading ? 'Invio in corso...' : 'Invia Modulo'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
