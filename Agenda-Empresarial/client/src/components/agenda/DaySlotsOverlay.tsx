import React, { useMemo } from "react";
import { useApp } from "../../state/store";
import { makeSlots, addHHmm } from "../../lib/date";
import { format } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const s1 = toMin(aStart), e1 = toMin(aEnd);
  const s2 = toMin(bStart), e2 = toMin(bEnd);
  return s1 < e2 && s2 < e1;
}

export default function DaySlotsOverlay({
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
  const weekday = date.getDay();

  const slots = useMemo(
    () => makeSlots(settings.workStart, settings.workEnd, settings.slotMinutes),
    [settings.workStart, settings.workEnd, settings.slotMinutes]
  );

  // markers (v2) + legado (v1)
  const allMarkers = (((settings as any).markers ?? []) as any[]);
  const holidayMarkers = allMarkers.filter((m: any) => m.kind === "holiday");
  const legacyHolidays = ((settings as any).holidays ?? []) as any[];
  const isHoliday = (allMarkers.length ? holidayMarkers : legacyHolidays).some((h: any) =>
    h?.annual ? dateISO.slice(5) === (h.dateISO || "").slice(5) : dateISO === h.dateISO
  );

  const dayClosed = (settings.blockedWeekdays ?? []).includes(weekday) || isHoliday;

  const dailyClosures = ((settings as any).dailyClosures ?? []) as { start: string; end: string }[];
  const weekdayClosures = ((settings as any).weekdayClosures ?? []) as { weekday: number; start: string; end: string }[];

  const slotFallsInClosure = (s: string) => {
    const endSlot = addHHmm(s, settings.slotMinutes ?? 30);
    const hitDaily = dailyClosures.some((c) => overlap(s, endSlot, c.start, c.end));
    const hitWeekday = weekdayClosures
      .filter((c) => c.weekday === weekday)
      .some((c) => overlap(s, endSlot, c.start, c.end));
    return hitDaily || hitWeekday;
  };

  // ocupado se QUALQUER agendamento ativo do dia sobrepõe o intervalo do slot
  const taken = useMemo(
    () =>
      appointments
        .filter((a) => a.dateISO === dateISO && a.status !== "canceled")
        .map((a) => ({ start: a.start, end: a.end })),
    [appointments, dateISO]
  );

  // ativa rolagem só quando tem muitos horários
  const needsScroll = slots.length > 18;

  return (
    <div className="absolute inset-0 z-20 rounded-2xl">
      <div
        className={[
          "bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-3 md:p-4",
          needsScroll ? "h-full max-h-[72vh] overflow-auto" : ""
        ].join(" ")}
      >
        {/* header */}
        <div
          className={[
            "flex items-center justify-between mb-3",
            needsScroll ? "sticky top-0 bg-white/80 backdrop-blur px-1 py-1 rounded-lg" : ""
          ].join(" ")}
        >
          <div className="font-semibold">
            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </div>
          <button className="btn btn-ghost text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>

        {/* aviso de dia fechado */}
        {dayClosed && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Dia fechado {isHoliday ? "(feriado)" : "(dia da semana fechado)"} — agendamentos indisponíveis.
          </div>
        )}

        {/* grade de horários */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {slots.map((s) => {
            const endSlot = addHHmm(s, settings.slotMinutes ?? 30);

            const busy = taken.some((a) => overlap(s, endSlot, a.start, a.end));
            const inClosure = slotFallsInClosure(s);

            // Regra: se o dia está fechado → desabilita tudo.
            // Se está em fechamento (almoço etc.), NÃO desabilita; confirmação acontece no modal.
            const disabled = dayClosed || busy;

            const label = dayClosed
              ? "Fechado"
              : busy
              ? "Ocupado"
              : inClosure
              ? "Fechado (intervalo)"
              : s;

            const classes = disabled
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : inClosure
              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              : "bg-white hover:bg-[hsl(var(--brand-50))] border-slate-200 hover:border-[hsl(var(--brand-200))] shadow-sm hover:shadow-md";

            const aria = `Horário ${s} ${
              dayClosed ? "dia fechado" : busy ? "ocupado" : inClosure ? "intervalo bloqueado — confirmação necessária" : "disponível"
            }`;

            return (
              <button
                key={s}
                disabled={disabled}
                onClick={() => onPick(s)}
                className={[
                  "rounded-xl px-3 py-3 text-sm text-center border transition-all",
                  classes
                ].join(" ")}
                aria-label={aria}
                title={label}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
