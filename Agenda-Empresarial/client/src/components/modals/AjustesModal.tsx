// src/components/modals/AjustesModal.tsx
import React, { useState } from "react";
import { useApp } from "../../state/store";
import TimeSelect30 from "../forms/TimeSelect30";

type Interval = { start: string; end: string };
type WeekdayClosure = { weekday: number; start: string; end: string };
type Marker = {
  kind: "holiday" | "special";
  dateISO: string;
  description: string;
  color: string;
  annual?: boolean;
};

const WEEK_LABELS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

export function AjustesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useApp();

  const [workStart, setWorkStart] = useState(settings.workStart ?? "09:00");
  const [workEnd, setWorkEnd] = useState(settings.workEnd ?? "18:00");

  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>(
    settings.blockedWeekdays ?? []
  );
  const [dailyClosures, setDailyClosures] = useState<Interval[]>(
    (settings as any).dailyClosures ?? []
  );
  const [weekdayClosures, setWeekdayClosures] = useState<WeekdayClosure[]>(
    (settings as any).weekdayClosures ?? []
  );

  // Markers unificado (compatível com legado)
  const initialMarkers: Marker[] = (() => {
    const m = ((settings as any).markers ?? []) as Marker[];
    if (m && m.length) return m;
    const holidays = ((settings as any).holidays ?? []).map((h: any) => ({
      kind: "holiday" as const,
      dateISO: h.dateISO ?? "",
      description: h.description ?? "Feriado",
      color: h.color ?? "#ef4444",
      annual: !!h.annual,
    }));
    const specials = ((settings as any).specialDates ?? []).map((s: any) => ({
      kind: "special" as const,
      dateISO: s.dateISO ?? "",
      description: s.description ?? "Especial",
      color: s.color ?? "#f59e0b",
      annual: !!s.annual,
    }));
    return [...holidays, ...specials];
  })();
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers);

  const toggleWeekday = (w: number) =>
    setBlockedWeekdays((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  const addDaily = () => setDailyClosures((p) => [...p, { start: "12:00", end: "14:00" }]);
  const rmDaily = (i: number) => setDailyClosures((p) => p.filter((_, idx) => idx !== i));
  const setDaily = (i: number, patch: Partial<Interval>) =>
    setDailyClosures((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const addWeekdayClosure = () =>
    setWeekdayClosures((p) => [...p, { weekday: 0, start: "00:00", end: "00:30" }]);
  const rmWeekdayClosure = (i: number) => setWeekdayClosures((p) => p.filter((_, idx) => idx !== i));
  const setWeekdayC = (i: number, patch: Partial<WeekdayClosure>) =>
    setWeekdayClosures((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const addMarker = () =>
    setMarkers((p) => [
      ...p,
      { kind: "special", dateISO: "", description: "", color: "#f59e0b", annual: false },
    ]);
  const rmMarker = (i: number) => setMarkers((p) => p.filter((_, idx) => idx !== i));
  const setMarker = (i: number, patch: Partial<Marker>) =>
    setMarkers((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const save = () => {
    const next = {
      workStart,
      workEnd,
      blockedWeekdays,
      dailyClosures,
      weekdayClosures,
      markers,
      holidays: markers.filter((m) => m.kind === "holiday").map(({ kind, ...h }) => h),
      specialDates: markers.filter((m) => m.kind === "special").map(({ kind, ...s }) => s),
    };
    const st: any = useApp.getState();
    if (typeof st.updateSettings === "function") st.updateSettings(next);
    else if (typeof (useApp as any).setState === "function")
      (useApp as any).setState((s: any) => ({ settings: { ...s.settings, ...next } }));
    onClose();
  };

  if (!open) return null;

  return (
    // CENTRALIZADO em todas as telas
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-10">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl">
        {/* Painel sem overflow-hidden no container do campo (evita clipping dos dropdowns) */}
        <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header sticky */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="font-semibold">Ajustes</div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
          </div>

          {/* Body rolável */}
          <div className="px-4 py-3 space-y-6 text-sm max-h-[72vh] overflow-y-auto">
            {/* Funcionamento */}
            <section className="space-y-2">
              <div className="font-medium">Funcionamento (grade de horários)</div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <span>Início</span>
                  <div className="relative overflow-visible z-20">
                    <TimeSelect30 value={workStart} onChange={setWorkStart} />
                  </div>
                </label>
                <label className="inline-flex items-center gap-2">
                  <span>Fim</span>
                  <div className="relative overflow-visible z-20">
                    <TimeSelect30 value={workEnd} onChange={setWorkEnd} />
                  </div>
                </label>
              </div>
            </section>

            {/* Dias fechados */}
            <section>
              <div className="font-medium mb-2">Dias da semana fechados</div>
              <div className="flex flex-wrap gap-3">
                {WEEK_LABELS.map((lbl, idx) => (
                  <label key={lbl} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={blockedWeekdays.includes(idx)}
                      onChange={() => toggleWeekday(idx)}
                    />
                    <span>{lbl}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Fechamentos diários */}
            <section>
              <div className="font-medium mb-2">Fechamentos diários (intervalos)</div>
              <div className="space-y-2">
                {dailyClosures.map((it, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <div className="relative overflow-visible z-20">
                      <TimeSelect30 value={it.start} onChange={(v) => setDaily(idx, { start: v })} />
                    </div>
                    <span>até</span>
                    <div className="relative overflow-visible z-20">
                      <TimeSelect30 value={it.end} onChange={(v) => setDaily(idx, { end: v })} />
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => rmDaily(idx)}>✕</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={addDaily}>+ Adicionar intervalo</button>
              </div>
            </section>

            {/* Fechamentos por dia da semana */}
            <section>
              <div className="font-medium mb-2">Fechamentos por dia da semana</div>
              <div className="space-y-2">
                {weekdayClosures.map((it, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <div className="relative overflow-visible">
                      <select
                        className="border rounded-lg px-2 py-1"
                        value={it.weekday}
                        onChange={(e) => setWeekdayC(idx, { weekday: Number(e.target.value) })}
                      >
                        {WEEK_LABELS.map((lbl, i) => (
                          <option key={lbl} value={i}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative overflow-visible z-20">
                      <TimeSelect30 value={it.start} onChange={(v) => setWeekdayC(idx, { start: v })} />
                    </div>
                    <span>até</span>
                    <div className="relative overflow-visible z-20">
                      <TimeSelect30 value={it.end} onChange={(v) => setWeekdayC(idx, { end: v })} />
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => rmWeekdayClosure(idx)}>✕</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={addWeekdayClosure}>+ Adicionar fechamento</button>
              </div>
            </section>

            {/* Feriados & Datas */}
            <section>
              <div className="font-medium mb-2">Feriados & Datas (cor + legenda)</div>
              <div className="space-y-3">
                {markers.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:[grid-template-columns:150px_1fr_1fr_auto_auto_auto] gap-2 items-center">
                    <div className="relative overflow-visible">
                      <select
                        className="border rounded-lg px-2 py-1"
                        value={m.kind}
                        onChange={(e) => setMarker(idx, { kind: e.target.value as Marker["kind"] })}
                      >
                        <option value="holiday">Feriado (fecha)</option>
                        <option value="special">Especial (destaca)</option>
                      </select>
                    </div>
                    <input
                      type="date"
                      className="border rounded-lg px-2 py-1"
                      value={m.dateISO}
                      onChange={(e) => setMarker(idx, { dateISO: e.target.value })}
                    />
                    <input
                      type="text"
                      className="border rounded-lg px-2 py-1"
                      placeholder="Descrição"
                      value={m.description}
                      onChange={(e) => setMarker(idx, { description: e.target.value })}
                    />
                    <input
                      type="color"
                      className="h-9 w-12 border rounded-lg"
                      value={m.color}
                      onChange={(e) => setMarker(idx, { color: e.target.value })}
                      title="Cor"
                    />
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!m.annual}
                        onChange={(e) => setMarker(idx, { annual: e.target.checked })}
                      />
                      <span>Anual</span>
                    </label>
                    <button className="btn btn-ghost btn-sm" onClick={() => rmMarker(idx)}>Remover</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={addMarker}>+ Adicionar</button>
              </div>
            </section>
          </div>

          {/* Footer fixo */}
          <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white z-10">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AjustesModal;
