"use client";
import { ReactNode } from "react";
import { Candidato } from "@/types/admin";
import { calcolaAnnoScolastico, faseDi } from "@/lib/donato";

export default function VistaStatistiche({ dati, candidature, annoAttivo }: { dati: Candidato[]; candidature: Candidato[]; annoAttivo: string }) {
  const conta = (f: ReturnType<typeof faseDi>) => dati.filter((c) => faseDi(c) === f).length;
  const daContattare = conta("da_contattare");
  const daRicontattare = conta("da_ricontattare");
  const inTurno = conta("in_turno");
  const confermati = conta("confermato");

  const statsScuole = dati.reduce((acc: Record<string, number>, c) => {
    const scuola = c.istituto || "Non specificato";
    acc[scuola] = (acc[scuola] || 0) + 1;
    return acc;
  }, {});
  const scuoleOrdinate = Object.entries(statsScuole).sort((a, b) => b[1] - a[1]);

  const storici: Record<string, Record<string, number>> = {};
  candidature.forEach((c) => {
    const sc = c.istituto || "Non specificato";
    const an = calcolaAnnoScolastico(c.created_at);
    if (!storici[sc]) storici[sc] = {};
    storici[sc][an] = (storici[sc][an] || 0) + 1;
  });
  const maxVal = Math.max(...scuoleOrdinate.map((s) => s[1]), 1);

  const Card = ({ icona, colore, titolo, valore, children }: { icona: string; colore: string; titolo: string; valore: number; children?: ReactNode }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-12 h-12 ${colore} rounded-full flex items-center justify-center text-xl shrink-0`}>{icona}</div>
      <div className="flex-1">
        <p className="text-sm text-slate-500 font-semibold">{titolo}</p>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-black text-slate-800">{valore}</p>
          {children}
        </div>
      </div>
    </div>
  );

  const Cerchio = ({ n, label, stile }: { n: number; label: string; stile: string }) => (
    <div className="flex flex-col items-center w-1/4 px-1">
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center text-xl font-black mb-2 shadow-sm ${stile}`}>{n}</div>
      <span className="text-xs md:text-sm font-bold text-slate-700 text-center">{label}</span>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icona="👥" colore="bg-blue-50 text-blue-600" titolo="Totale risposte" valore={dati.length}>
          {annoAttivo === "Tutti" && (
            <div className="flex items-end gap-1 h-8 opacity-60">
              {Object.values(storici).map((scuolaData, i) => {
                const tot = Object.values(scuolaData).reduce((a, b) => a + b, 0);
                return <div key={i} className="w-2 bg-blue-400 rounded-t-sm" style={{ height: `${Math.min(100, (tot / maxVal) * 100)}%` }} />;
              })}
            </div>
          )}
        </Card>
        <Card icona="✅" colore="bg-green-50 text-green-600" titolo="Turni confermati" valore={confermati} />
        <Card icona="⏳" colore="bg-amber-50 text-amber-600" titolo="Da gestire" valore={daContattare + daRicontattare + inTurno} />
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">🌳 A che punto sono i &quot;sì&quot;</h3>
        <div className="flex flex-col items-center">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-md text-center">Sì / Già donatori ({daContattare + daRicontattare + inTurno + confermati})</div>
          <div className="w-1 h-6 bg-slate-200" />
          <div className="w-full max-w-3xl h-1 bg-slate-200" />
          <div className="w-full max-w-4xl flex justify-between mt-4">
            <Cerchio n={daContattare} label="Da contattare" stile="bg-slate-100 border-slate-200 text-slate-600" />
            <Cerchio n={inTurno} label="In turno, da confermare" stile="bg-blue-50 border-blue-200 text-blue-600" />
            <Cerchio n={confermati} label="Confermati" stile="bg-green-50 border-green-200 text-green-600" />
            <Cerchio n={daRicontattare} label="Da ricontattare" stile="bg-yellow-50 border-yellow-200 text-yellow-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">🏫 Risposte per scuola {annoAttivo === "Tutti" ? "(storico)" : `(${annoAttivo})`}</h3>
        {annoAttivo === "Tutti" ? (
          <div className="space-y-6">
            {scuoleOrdinate.map(([scuola, totale]) => {
              const anniScuola = storici[scuola] || {};
              const anniOrdinati = Object.keys(anniScuola).sort().reverse();
              const maxValScuola = Math.max(...Object.values(anniScuola), 1);
              return (
                <div key={scuola} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-end mb-2 gap-2">
                    <span className="font-bold text-slate-800">{scuola}</span>
                    <span className="text-xs font-black bg-slate-100 text-slate-600 px-2 py-1 rounded whitespace-nowrap">Totale: {totale}</span>
                  </div>
                  <div className="flex gap-2 items-end h-16 bg-slate-50 p-2 rounded-lg border border-slate-100 overflow-x-auto">
                    {anniOrdinati.map((anno) => {
                      const val = anniScuola[anno];
                      return (
                        <div key={anno} className="flex flex-col items-center w-12 shrink-0 h-full justify-end" title={`${anno}: ${val}`}>
                          <div className="w-full bg-red-500 rounded-t-sm flex items-start justify-center" style={{ height: `${(val / maxValScuola) * 70}%`, minHeight: "4px" }}>
                            <span className="text-[10px] font-black text-white">{val}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 truncate w-full text-center">{anno}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 font-bold text-slate-600">Istituto</th>
                  <th className="p-4 font-bold text-slate-600 text-right">Risposte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {scuoleOrdinate.map(([scuola, count]) => (
                  <tr key={scuola}>
                    <td className="p-4 font-bold text-slate-800">{scuola}</td>
                    <td className="p-4 text-right font-black text-red-600 text-lg">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
