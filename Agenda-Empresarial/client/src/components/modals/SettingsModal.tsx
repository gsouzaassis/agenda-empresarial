import React, { useMemo, useState } from "react";
import { useApp } from "../../state/store";
import TimeSelect30 from "../forms/TimeSelect30";

type DailyClosure = { start: string; end: string };
type WeekdayClosure = { weekday: number; start: string; end: string };
type Marker = {
  dateISO: string;
  description?: string;
  color?: string;
  annual?: boolean;
  kind?: "holiday" | "special";
};

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { settings } = useApp();

  const [workStart, setWorkStart] = useState(settings.workStart ?? "09:00");
  const [workEnd, setWorkEnd] = useState(settings.workEnd ?? "18:00");
  const [slotMinutes, setSlotMinutes] = useState(settings.slotMinutes ?? 30);

  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>(
    (settings.blockedWeekdays ?? []).slice()
  );

  const [dailyClosures, setDailyClosures] = useState<DailyClosure[]>(
    ((settings as any).dailyClosures ?? []).slice()
  );
  const [weekdayClosures, setWeekdayClosures] = useState<WeekdayClosure[]>(
    ((settings as any).weekdayClosures ?? []).slice()
  );

  // markers unificados (mantém kind para feriado/especial)
  const initialMarkers: Marker[] = useMemo(() => {
    const m = ((settings as any).markers ?? []) as Marker[];
    if (m?.length) return m;
    const holidays = (((settings as any).holidays ?? []) as Marker[]).map(h => ({ ...h, kind: "holiday" as const }));
    const specials  = (((settings as any).specialDates ?? []) as Marker[]).map(s => ({ ...s, kind: "special" as const }));
    return [...holidays, ...specials];
  }, [settings]);
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers);

  const [err, setErr] = useState("");

  const toggleWeekday = (w: number) =>
    setBlockedWeekdays(prev => (prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]));

  const addDailyClosure    = () => setDailyClosures(arr => [...arr, { start: workStart, end: workEnd }]);
  const updateDailyClosure = (i: number, p: Partial<DailyClosure>) => setDailyClosures(arr => arr.map((c,idx)=> idx===i?{...c,...p}:c));
  const removeDailyClosure = (i: number) => setDailyClosures(arr => arr.filter((_,idx)=> idx!==i));

  const addWeekdayClosure    = () => setWeekdayClosures(arr => [...arr, { weekday: 1, start: workStart, end: workEnd }]);
  const updateWeekdayClosure = (i: number, p: Partial<WeekdayClosure>) => setWeekdayClosures(arr => arr.map((c,idx)=> idx===i?{...c,...p}:c));
  const removeWeekdayClosure = (i: number) => setWeekdayClosures(arr => arr.filter((_,idx)=> idx!==i));

  const addMarker    = () =>
    setMarkers(arr => [
      ...arr,
      {
        dateISO: new Date().toISOString().slice(0,10),
        description: "",
        color: "#f59e0b",
        annual: false,
        kind: "special", // padrão: “especial” (não fecha)
      },
    ]);
  const updateMarker = (i: number, p: Partial<Marker>) => setMarkers(arr => arr.map((m,idx)=> idx===i?{...m,...p}:m));
  const removeMarker = (i: number) => setMarkers(arr => arr.filter((_,idx)=> idx!==i));

  function save() {
    setErr("");
    if (workStart >= workEnd) { setErr("Hora inicial deve ser menor que a final."); return; }

    const next = {
      ...settings,
      workStart,
      workEnd,
      slotMinutes: Number(slotMinutes) || 30,
      blockedWeekdays: blockedWeekdays.slice().sort(),
      dailyClosures,
      weekdayClosures,
      markers,           // fonte da verdade
      holidays: [],      // limpa legado para não “voltar”
      specialDates: [],  // idem
    };

    const st: any = useApp.getState();
    if (typeof st.updateSettings === "function") {
      st.updateSettings(next);
    } else if (typeof (useApp as any).setState === "function") {
      (useApp as any).setState((s: any) => ({ settings: { ...s.settings, ...next } }));
    }
    onClose();
  }

  if (!open) return null;

  // altura da tabbar inferior (72px) + safe-area + folga
  const bottomOffset = 'calc(72px + env(safe-area-inset-bottom) + 16px)';
  const maxH = 'calc(100dvh - (72px + env(safe-area-inset-bottom) + 24px))';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Centralização por flex (sem transform) */}
      <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-3 sm:p-10">
        <div className="w-full sm:w-[820px]" style={{ marginBottom: bottomOffset }}>
          {/* Painel sem overflow-hidden para não clipar dropdowns */}
          <div
            className="mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl w-full"
            style={{
              maxHeight: `min(${maxH}, 760px)`,
              display: 'grid',
              gridTemplateRows: 'auto minmax(0,1fr) auto',
            } as React.CSSProperties}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold">Ajustes</div>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-6 overflow-y-auto text-sm">
              {err && <div className="text-red-600">{err}</div>}

              <section className="space-y-3">
                <div className="font-semibold">Funcionamento</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="block">
                    <div className="text-xs text-slate-600 mb-1">Início</div>
                    <div className="relative overflow-visible z-20">
                      <TimeSelect30 value={workStart} onChange={setWorkStart} />
                    </div>
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-600 mb-1">Fim</div>
                    <div className="relative overflow-visible z-20">
                      <TimeSelect30 value={workEnd} onChange={setWorkEnd} />
                    </div>
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-600 mb-1">Intervalo (min)</div>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      className="w-full border rounded-lg px-2 py-2"
                      value={slotMinutes}
                      onChange={(e)=>setSlotMinutes(Number(e.target.value))}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <div className="font-semibold">Dias da semana fechados</div>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                  {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((w,i)=>(
                    <label key={w} className="flex items-center gap-2 border rounded-lg px-2 py-2">
                      <input
                        type="checkbox"
                        checked={blockedWeekdays.includes(i)}
                        onChange={()=>toggleWeekday(i)}
                      />
                      <span>{w}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Fechamentos diários</div>
                  <button className="btn btn-ghost btn-sm" onClick={addDailyClosure}>+ adicionar</button>
                </div>
                {dailyClosures.length === 0 ? (
                  <div className="text-slate-500">Nenhum intervalo cadastrado.</div>
                ) : (
                  <div className="space-y-2">
                    {dailyClosures.map((c, idx) => (
                      <div key={idx} className="grid grid-cols-2 md:grid-cols-[1fr_1fr_auto] gap-2">
                        <div className="relative overflow-visible z-20">
                          <TimeSelect30 value={c.start} onChange={(v)=>updateDailyClosure(idx,{start:v})}/>
                        </div>
                        <div className="relative overflow-visible z-20">
                          <TimeSelect30 value={c.end} onChange={(v)=>updateDailyClosure(idx,{end:v})}/>
                        </div>
                        <div className="flex items-center">
                          <button className="btn btn-ghost btn-sm" onClick={()=>removeDailyClosure(idx)}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Fechamentos por dia da semana</div>
                  <button className="btn btn-ghost btn-sm" onClick={addWeekdayClosure}>+ adicionar</button>
                </div>
                {weekdayClosures.length === 0 ? (
                  <div className="text-slate-500">Nenhum fechamento por dia.</div>
                ) : (
                  <div className="space-y-2">
                    {weekdayClosures.map((c, idx) => (
                      <div key={idx} className="grid grid-cols-2 md:grid-cols-[140px_1fr_1fr_auto] gap-2">
                        <div className="relative overflow-visible">
                          <select
                            className="border rounded-lg px-2 py-2"
                            value={c.weekday}
                            onChange={(e)=>updateWeekdayClosure(idx,{weekday:Number(e.target.value)})}
                          >
                            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((w,i)=> <option key={w} value={i}>{w}</option>)}
                          </select>
                        </div>
                        <div className="relative overflow-visible z-20">
                          <TimeSelect30 value={c.start} onChange={(v)=>updateWeekdayClosure(idx,{start:v})}/>
                        </div>
                        <div className="relative overflow-visible z-20">
                          <TimeSelect30 value={c.end} onChange={(v)=>updateWeekdayClosure(idx,{end:v})}/>
                        </div>
                        <div className="flex items-center">
                          <button className="btn btn-ghost btn-sm" onClick={()=>removeWeekdayClosure(idx)}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Feriados & Datas especiais</div>
                  <button className="btn btn-ghost btn-sm" onClick={addMarker}>+ adicionar</button>
                </div>
                {markers.length === 0 ? (
                  <div className="text-slate-500">Nenhuma data marcada.</div>
                ) : (
                  <div className="space-y-2">
                    {markers.map((m, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-2 md:grid-cols-[150px_1fr_120px_110px_160px_auto] gap-2 items-center"
                      >
                        {/* Tipo: feriado/especial */}
                        <div className="relative overflow-visible">
                          <select
                            className="border rounded-lg px-2 py-2"
                            value={m.kind ?? "special"}
                            onChange={(e)=>updateMarker(idx,{kind: e.target.value as "holiday" | "special"})}
                            title="Tipo da data"
                          >
                            <option value="holiday">Feriado (fecha o dia)</option>
                            <option value="special">Especial (apenas destaca)</option>
                          </select>
                        </div>

                        <input
                          type="date"
                          className="border rounded-lg px-2 py-2"
                          value={m.dateISO}
                          onChange={(e)=>updateMarker(idx,{dateISO:e.target.value})}
                        />
                        <input
                          className="border rounded-lg px-2 py-2"
                          placeholder="Descrição (legenda)"
                          value={m.description ?? ""}
                          onChange={(e)=>updateMarker(idx,{description:e.target.value})}
                        />
                        <input
                          type="color"
                          className="h-10 w-full border rounded-lg px-2 py-2"
                          value={m.color ?? "#f59e0b"}
                          onChange={(e)=>updateMarker(idx,{color:e.target.value})}
                          title="Cor"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!m.annual}
                            onChange={(e)=>updateMarker(idx,{annual:e.target.checked})}
                          />
                          <span>Anual</span>
                        </label>
                        <div className="flex items-center">
                          <button className="btn btn-ghost btn-sm" onClick={()=>removeMarker(idx)}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Footer fixo */}
            <div
              className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 bg-white"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Salvar ajustes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
