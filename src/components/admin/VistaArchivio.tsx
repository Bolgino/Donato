"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Candidato } from "@/types/admin";
import { contiene, ETICHETTA_FASE, faseDi, fmtData, isAspirante, isGiaDonatore, isNo, isPensarci, nomeCompleto, scaricaCsvArchivio } from "@/lib/donato";
import { Azioni } from "./tipi";
import { Bottone, Chip, Istruzioni, TipoBadge, Vuoto } from "./ui";

type Filtro = "tutti" | "si" | "donatori" | "pensano" | "no";

export default function VistaArchivio({ lista, annoAttivo, azioni, ricerca }: { lista: Candidato[]; annoAttivo: string; azioni: Azioni; ricerca: string }) {
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const passaFiltro = (c: Candidato, f: Filtro) =>
    f === "tutti" ||
    (f === "si" && isAspirante(c.tipo_adesione)) ||
    (f === "donatori" && isGiaDonatore(c.tipo_adesione)) ||
    (f === "pensano" && isPensarci(c.tipo_adesione)) ||
    (f === "no" && isNo(c.tipo_adesione));
  const conta = (f: Filtro) => lista.filter((c) => passaFiltro(c, f)).length;
  const mostrati = lista.filter((c) => passaFiltro(c, filtro) && contiene(c, ricerca)).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const esporta = () => {
    if (lista.length === 0) return toast.error("Nessun dato da esportare per l'anno selezionato.");
    scaricaCsvArchivio(lista, annoAttivo);
    toast.success(`Esportate ${lista.length} risposte (${annoAttivo === "Tutti" ? "tutti gli anni" : annoAttivo}).`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Istruzioni id="archivio">
        <p>
          Tutte le risposte arrivate dal modulo, anche i &quot;No&quot;. Tocca un nome per vedere la scheda completa (da lì puoi anche <b>eliminarlo</b>).
        </p>
        <p>
          Con <b>📊 Esporta Excel</b> scarichi tutto l&apos;anno scolastico scelto in alto. Il file contiene dati personali: tienilo al sicuro e cancellalo quando non serve più.
        </p>
      </Istruzioni>

      <div className="flex flex-wrap items-center gap-2">
        <Chip attivo={filtro === "tutti"} onClick={() => setFiltro("tutti")}>
          Tutti ({conta("tutti")})
        </Chip>
        <Chip attivo={filtro === "si"} onClick={() => setFiltro("si")}>
          🌱 Sì ({conta("si")})
        </Chip>
        <Chip attivo={filtro === "donatori"} onClick={() => setFiltro("donatori")}>
          🩸 Già donatori ({conta("donatori")})
        </Chip>
        <Chip attivo={filtro === "pensano"} onClick={() => setFiltro("pensano")}>
          🤔 Ci pensano ({conta("pensano")})
        </Chip>
        <Chip attivo={filtro === "no"} onClick={() => setFiltro("no")}>
          No ({conta("no")})
        </Chip>
        <div className="ml-auto">
          <Bottone tipo="ok" onClick={esporta}>
            📊 Esporta Excel ({annoAttivo === "Tutti" ? "tutti gli anni" : annoAttivo})
          </Bottone>
        </div>
      </div>

      {mostrati.length === 0 ? (
        <Vuoto titolo="Nessuna risposta qui." />
      ) : (
        <ul className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {mostrati.map((c) => (
            <li key={c.id}>
              <button onClick={() => azioni.apriScheda(c.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-[11px] text-slate-400 w-20 shrink-0">{fmtData(c.created_at)}</span>
                <span className="font-bold text-slate-800 flex-1 min-w-0 truncate">{nomeCompleto(c)}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <TipoBadge tipo={c.tipo_adesione} />
                  <span className="text-[10px] font-semibold text-slate-500">{ETICHETTA_FASE[faseDi(c)]}</span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                    {c.istituto}
                    {c.classe ? ` · ${c.classe}` : ""}
                  </span>
                  <span className="text-[10px] text-slate-400" title="Consenso privacy / foto-video">
                    Privacy {c.consenso_privacy ? "✅" : "❌"} Media {c.consenso_multimediale ? "✅" : "❌"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
