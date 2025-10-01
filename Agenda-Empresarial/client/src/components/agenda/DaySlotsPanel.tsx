import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../state/store";
import { makeSlots } from "../../lib/date";
import { format, isToday } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

/** breakpoints Tailwind: sm=640, md=768, lg=1024, xl=1280 */
function useGridCols() {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1280) setCols(8);
      else if (w >= 1024) setCols(8);
      else if (w >= 768) setCols(6);
      else if (w >= 640) setCols(4);
      else setCols(3);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return cols;
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function slotHitsClosure(slot: string, start: string, end: string) {
  // considera "fechado" se o início do slot cai em [start, end)
  return slot >= start && slot < end;
}

export default function DaySlotsPanel({
  date,
  onPick,
  onClose,
}: {
  date: Date;
  onPick: (hhmm: string) => void;
  onClose: () => void;
}) {
  const { settings, appointments } = useApp();
  const dateISO = date.toISOString().slice(0, 10);
  const cols = useGridCols();

  // slots conforme configs
  const allSlots = useMemo(
    () => makeSlots(settings.workStart, settings.workEnd, settings.slotMinutes),
    [settings.workStart, settings.workEnd, settings.slotMinutes]
  );

  // separação Manhã/Tarde
  const morningSlots = useMemo(() => allSlots.filter((s) => s < "12:00"), [allSlots]);
  const afternoonSlots = useMemo(() => allSlots.filter((s) => s >= "12:00"), [allSlots]);

  // slots ocupados pelo intervalo dos agendamentos (não cancelados)
  const taken = useMemo(() => {
    const minutes = settings.slotMinutes || 30;
    const expandIntervalToSlots = (start: string, end: string) => {
      const inside: string[] = [];
      for (let t = toMin(start); t < toMin(end); t += minutes) {
        const h = String(Math.floor(t / 60)).padStart(2, "0");
        const m = String(t % 60).padStart(2, "0");
        inside.push(`${h}:${m}`);
      }
      return inside;
    };

    return appointments
      .filter((a) => a.dateISO === dateISO && a.status !== "canceled")
      .flatMap((a) => expandIntervalToSlots(a.start, a.end));
  }, [appointments, dateISO, settings.slotMinutes]);

  // fechamentos configurados (modelo novo)
  const dailyClosures = (settings as any).dailyClosures ?? [];
  const weekdayClosures = ((settings as any).weekdayClosures ?? []).filter(
    (c: any) => c.weekday === date.getDay()
  );

  // feriados (fecham o dia) + legado
  const allMarkers = (((settings as any).markers ?? []) as any[]);
  const holidayMarkers = allMarkers.filter((m: any) => m.kind === "holiday");
  const legacyHolidays = ((settings as any).holidays ?? []) as any[];
  const isHoliday = useMemo(() => {
    const arr = allMarkers.length ? holidayMarkers : legacyHolidays;
    return arr.some((h: any) =>
      h?.annual ? dateISO.slice(5) === (h.dateISO || "").slice(5) : h.dateISO === dateISO
    );
  }, [allMarkers, holidayMarkers, legacyHolidays, dateISO]);

  // dia fechado (weekday fechado OU feriado)
  const isWeekdayClosed = (settings.blockedWeekdays ?? []).includes(date.getDay());
  const dayClosed = isWeekdayClosed || isHoliday;

  // Aba inicial
  const initialTab: "morning" | "afternoon" = useMemo(() => {
    if (!isToday(date)) return "morning";
    return new Date().getHours() >= 12 ? "afternoon" : "morning";
  }, [date]);

  const [tab, setTab] = useState<"morning" | "afternoon">(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const visible = tab === "morning" ? morningSlots : afternoonSlots;

  return (
    <div className="card mt-3">
      {/* Cabeçalho com tabs e FECHAR */}
      <div className="card-header flex items-center justify-between">
        <div className="font-semibold">
          {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 rounded-xl p-1 flex">
            <button
              type="button"
              onClick={() => setTab("morning")}
              className={[
                "px-3 py-1.5 text-sm rounded-lg",
                tab === "morning"
                  ? "bg-white shadow border border-slate-200 text-[hsl(var(--brand-700))]"
                  : "text-slate-600",
              ].join(" ")}
            >
              Manhã
            </button>
            <button
              type="button"
              onClick={() => setTab("afternoon")}
              className={[
                "px-3 py-1.5 text-sm rounded-lg",
                tab === "afternoon"
                  ? "bg-white shadow border border-slate-200 text-[hsl(var(--brand-700))]"
                  : "text-slate-600",
              ].join(" ")}
            >
              Tarde
            </button>
          </div>

          <button className="btn btn-ghost text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>

      {/* Grade */}
      <div className="card-body">
        {dayClosed ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            Dia fechado {isHoliday ? "(feriado)" : "(dia da semana fechado)"} — agendamentos indisponíveis.
          </div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-slate-500">Sem horários nesta faixa.</div>
        ) : (
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: "6px" }}
          >
            {visible.map((s) => {
              const isTaken = taken.includes(s);

              // Fechamentos (não desabilitam — confirmação no modal)
              const isDailyClosed = (dailyClosures as { start: string; end: string }[]).some((c) =>
                slotHitsClosure(s, c.start, c.end)
              );
              const isWeekdayClosure = (weekdayClosures as {
                weekday: number;
                start: string;
                end: string;
              }[]).some((c) => slotHitsClosure(s, c.start, c.end));

              // Regras:
              // - "ocupado" => desabilita
              // - "fechamento" (diário/weekday) => clicável com estilo diferente (confirmação no modal)
              const disabled = isTaken;

              const base =
                "rounded-lg px-2 py-3 text-sm text-center border transition-all";
              const cls = disabled
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : isDailyClosed || isWeekdayClosure
                ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                : "bg-white hover:bg-[hsl(var(--brand-50))] border-slate-200 hover:border-[hsl(var(--brand-200))] shadow-sm hover:shadow-md";

              const aria =
                `Horário ${s} ` +
                (disabled
                  ? "ocupado"
                  : isDailyClosed || isWeekdayClosure
                  ? "intervalo bloqueado — confirmação necessária"
                  : "disponível");

              const title =
                isDailyClosed || isWeekdayClosure ? `${s} · Fechado (intervalo)` : undefined;

              return (
                <button
                  key={s}
                  disabled={disabled}
                  onClick={() => onPick(s)}
                  className={[base, cls].join(" ")}
                  aria-label={aria}
                  title={title}
                >
                  {disabled
                    ? "Ocupado"
                    : isDailyClosed || isWeekdayClosure
                    ? `${s} · Fechado`
                    : s}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
