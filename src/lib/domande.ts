// Domande frequenti che i ragazzi fanno (dal documento "Domande frequenti" del Progetto Scuole).
// Per aggiungerne o cambiarne una, modifica questo elenco.
export interface Domanda {
  d: string;
  r: string;
  tema: "Visita e requisiti" | "Salute" | "Abitudini" | "Midollo";
}

export const DOMANDE_RAGAZZI: Domanda[] = [
  { tema: "Visita e requisiti", d: "Posso fare la visita di idoneità se sono ancora minorenne?", r: "No, bisogna essere maggiorenni." },
  {
    tema: "Visita e requisiti",
    d: "Peso poco meno di 50 kg, posso donare?",
    r: "Se ne pesi 48-49 ti consigliamo di provare comunque a fare la visita di idoneità (magari cercando prima di guadagnare un chilo). Se ti dicono che non puoi, ritenta in futuro quando peserai un po' di più.",
  },
  { tema: "Visita e requisiti", d: "Le donne devono aspettare 6 mesi tra due donazioni?", r: "No, 90 giorni ma per max 2 donazioni in 365 giorni." },
  {
    tema: "Visita e requisiti",
    d: "Durante il periodo delle mestruazioni posso donare?",
    r: "No, deve passare qualche giorno dal termine del flusso mestruale. In ogni caso, è consigliato donare intorno alla metà del ciclo. La visita di idoneità può invece essere fatta in qualunque momento.",
  },
  { tema: "Visita e requisiti", d: "Prendo la pillola anticoncezionale, posso donare?", r: "Sì, senza particolari limitazioni." },
  { tema: "Abitudini", d: "Ho fatto un tatuaggio o piercing, posso donare?", r: "Sì, ma devono passare almeno 4 mesi da quando l'hai fatto." },
  { tema: "Abitudini", d: "Fumo, posso donare?", r: "Sì, basta non fumare prima della donazione e per 1 ora dopo." },
  {
    tema: "Abitudini",
    d: "Posso bere alcolici i giorni precedenti la donazione?",
    r: "In piccolissime quantità (una birra a pranzo) si può bere anche il giorno precedente la donazione, mentre se si è esagerato devono passare almeno 3-4 giorni prima di poter donare.",
  },
  {
    tema: "Abitudini",
    d: "L'assunzione di droghe esclude dalla donazione?",
    r: "Per le droghe \"leggere\" (cannabis) dal trasfusionale di Feltre viene data una sospensione di 4 mesi (varia molto da posto a posto), ma se si è dei consumatori abituali si è esclusi definitivamente. Viene poi escluso a priori chi assume o ha assunto sostanze stupefacenti per via endovenosa (come l'eroina) o chi ha fatto uso di droghe \"pesanti\" (cocaina, oppioidi, anfetamine, mdma, stimolanti, benzodiazepine e sostanze allucinogene come l'LSD).",
  },
  {
    tema: "Abitudini",
    d: "Cosa si intende per comportamenti sessuali a rischio?",
    r: "Sono a rischio di trasmissione di malattie infettive rapporti con più partner oppure quelli, protetti e non protetti, con partner non abituale, occasionale, nuovo, tossicodipendente, risultato positivo a test per epatite B, C o HIV, a rischio di esserlo o proveniente da paesi dove l'AIDS è malattia diffusa. L'abitudine a tali tipi di rapporti costituisce criterio di esclusione definitiva.",
  },
  {
    tema: "Abitudini",
    d: "L'omosessualità è una controindicazione alla donazione?",
    r: "No, l'idoneità dipende dai propri comportamenti indipendentemente dall'orientamento sessuale.",
  },
  {
    tema: "Salute",
    d: "Sono asmatico, posso donare?",
    r: "Se attualmente ti è stata diagnosticata l'asma, no. Ma se l'hai avuta solo da bambino o comunque sono passati indicativamente più di 5 anni dall'ultima manifestazione, puoi donare.",
  },
  {
    tema: "Salute",
    d: "Sono leggermente anemico (oppure portatore sano), posso donare?",
    r: "Dipende. Durante la visita di idoneità vengono fatte delle analisi al tuo sangue, per valutare la quantità di emoglobina presente. Se essa è sufficiente puoi donare, altrimenti no. Nei casi intermedi il medico può valutare di ridurre la frequenza di donazioni all'anno. In ogni caso è sempre ammessa la donazione di solo plasma.",
  },
  {
    tema: "Salute",
    d: "Ho da poco fatto un vaccino, posso donare?",
    r: "Il periodo di sospensione viene valutato dal medico in base al tipo di vaccinazione, generalmente basta che siano passati almeno 3 giorni. Per i vaccini anti-Covid19, devono passare almeno 48 ore.",
  },
  {
    tema: "Salute",
    d: "Assumo per qualche motivo farmaci, posso donare?",
    r: "Dipende. È necessaria la valutazione del medico riguardo il farmaco e la patologia o l'evento che ne hanno reso o ne rendono necessaria l'assunzione.",
  },
  {
    tema: "Salute",
    d: "Sono allergico a pollini, polvere o altro, posso donare?",
    r: "Sì, ma non puoi farlo quando hai manifestazioni allergiche in atto o se le hai avute negli ultimi 28 giorni.",
  },
  { tema: "Salute", d: "Mi ha punto una zecca, posso donare?", r: "Devono passare almeno 3 mesi, anche se non c'è stata infezione." },
  {
    tema: "Midollo",
    d: "Come funziona la donazione di midollo?",
    r: "Oggi quasi sempre avviene come una normale donazione di sangue tramite aferesi, preceduta però dall'assunzione di un farmaco (non pericoloso) nei 3-4 giorni precedenti. Si può donare solo se ci si è iscritti al registro internazionale dei potenziali donatori e se si viene chiamati perché un paziente sembra essere compatibile. La compatibilità tra due individui non consanguinei si verifica in 1 caso su 100.000, quindi è estremamente improbabile essere chiamati. I requisiti e la procedura di idoneità sono gli stessi della donazione di sangue, con l'aggiunta di analisi del sangue più approfondite.",
  },
];
