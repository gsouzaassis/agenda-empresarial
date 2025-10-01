import React from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useApp } from '../../state/store';

type Marker = {
  kind?: 'holiday' | 'special';
  dateISO: string;
  description?: string;
  color?: string;
  annual?: boolean;
};

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hexToRgba(hex?: string, alpha = 0.16) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function MonthCalendar({
  current,
  setCurrent,
  selected,
  onSelect,
  onToday,
}: {
  current: Date;
  setCurrent: (d: Date) => void;
  selected?: Date | null;
  onSelect: (d: Date) => void;
  onToday?: () => void;
}) {
  const { settings, appointments } = useApp();

  // range do grid (inclui sobras da semana)
  const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });

  const getAppointmentsForDay = (date: Date) => {
    const dateISO = toLocalISO(date);
    return appointments.filter((a) => a.dateISO === dateISO && a.status !== 'canceled');
  };

  // Markers (Ajustes) — com fallback
  const allMarkers: Marker[] = React.useMemo(() => {
    const m = ((settings as any).markers ?? []) as Marker[];
    if (m?.length) return m;
    const holidays = (((settings as any).holidays ?? []) as Marker[]).map(h => ({ ...h, kind: 'holiday' as const }));
    const specials  = (((settings as any).specialDates ?? []) as Marker[]).map(s => ({ ...s, kind: 'special' as const }));
    return [...holidays, ...specials];
  }, [settings]);

  // Helpers para verificar feriado fechando o dia
  const holidayPool = React.useMemo(() => {
    // se houver markers, usa só os 'holiday'; senão, usa legado 'holidays'
    const hasMarkers = allMarkers.length > 0;
    return hasMarkers
      ? allMarkers.filter(m => m.kind === 'holiday')
      : (((settings as any).holidays ?? []) as Marker[]);
  }, [allMarkers, settings]);

  const isHolidayDateISO = React.useCallback((iso: string) => {
    return holidayPool.some(h =>
      h?.annual ? iso.slice(5) === (h.dateISO || '').slice(5) : iso === h.dateISO
    );
  }, [holidayPool]);

  const getDayWash = (date: Date) => {
    const iso = toLocalISO(date);
    const list = allMarkers.filter((mk) =>
      mk.annual ? iso.slice(5) === (mk.dateISO || '').slice(5) : iso === mk.dateISO
    );
    if (list.length === 0) return undefined;
    const first = list[0];
    const color = first.color || (first.kind === 'holiday' ? '#ef4444' : '#f59e0b');
    return hexToRgba(color, 0.16);
  };

  // Legenda dinâmica (descrição + cor) para marcadores do mês visível
  const visibleMarkerBadges = React.useMemo(() => {
    const month = current.getMonth();
    const year = current.getFullYear();
    const inMonth = allMarkers.filter((mk) => {
      if (!mk.dateISO) return false;
      const d = new Date(mk.dateISO + 'T00:00:00');
      if (mk.annual) return d.getMonth() === month;
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const uniq: { desc: string; color: string }[] = [];
    for (const mk of inMonth) {
      const desc = (mk.description && mk.description.trim()) || (mk.kind === 'holiday' ? 'Feriado' : 'Especial');
      const color = mk.color || (mk.kind === 'holiday' ? '#ef4444' : '#f59e0b');
      if (!uniq.find(u => u.desc === desc && u.color === color)) {
        uniq.push({ desc, color });
      }
    }
    return uniq;
  }, [allMarkers, current]);

  const year = current.getFullYear();

  const handleMonthChange = (m: number) => {
    const d = new Date(current);
    d.setMonth(m);
    setCurrent(d);
  };

  const handleYearChange = (y: number) => {
    if (Number.isNaN(y)) return;
    const d = new Date(current);
    d.setFullYear(y);
    setCurrent(d);
  };

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        {/* Centro: navegação mês/ano */}
        <div className="flex-1 flex items-center justify-center gap-3">
          <button
            type="button"
            className="text-[hsl(var(--brand-700))] hover:text-[hsl(var(--brand-800))]"
            onClick={() => setCurrent(subMonths(current, 1))}
            aria-label="Mês anterior"
          >
            ‹
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
            <select
              className="text-sm outline-none capitalize"
              value={current.getMonth()}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              aria-label="Selecionar mês"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {format(new Date(2025, i, 1), 'MMMM', { locale: ptBR })}
                </option>
              ))}
            </select>

            <span className="text-slate-300">•</span>

            <input
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="w-20 text-sm font-semibold outline-none bg-transparent text-[hsl(var(--brand-700))]"
              aria-label="Digite o ano"
            />
          </div>

          <button
            type="button"
            className="text-[hsl(var(--brand-700))] hover:text-[hsl(var(--brand-800))]"
            onClick={() => setCurrent(addMonths(current, 1))}
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>

        {/* Direita: Hoje */}
        <div className="ml-auto">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-slate-200 hover:bg-slate-100"
            onClick={() => (onToday ? onToday() : setCurrent(new Date()))}
            aria-label="Ir para hoje"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="grid grid-cols-7 text-[10px] md:text-xs text-slate-500 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map((d) => {
            const iso = toLocalISO(d);
            const inMonth = isSameMonth(d, current);
            const sel = selected && isSameDay(d, selected);
            const dayAppointments = getAppointmentsForDay(d);
            const isToday = isSameDay(d, new Date());
            const wash = getDayWash(d);

            // Fechamento por dia da semana OU feriado (fecha o dia)
            const isWeekdayClosed = (settings.blockedWeekdays ?? []).includes(d.getDay());
            const isHoliday = isHolidayDateISO(iso);
            const dayClosed = isWeekdayClosed || isHoliday;

            // Barrinhas: ignora cancelados; cores por status
            const bars = dayAppointments;
            const extra = Math.max(0, bars.length - 3);

            // Tooltip/aria com descrições das marcações do dia
            const todaysMarkers = allMarkers.filter((mk) =>
              mk.annual ? iso.slice(5) === (mk.dateISO || '').slice(5) : iso === mk.dateISO
            );
            const markerTitle = todaysMarkers
              .map(mk => (mk.description?.trim() || (mk.kind === 'holiday' ? 'Feriado' : 'Especial')))
              .join(' • ') || undefined;

            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => onSelect(d)}
                disabled={dayClosed}
                className={[
                  'rounded-xl border flex flex-col items-center justify-center',
                  'p-1.5 md:p-2 h-11 md:h-16 gap-0.5 md:gap-1',
                  sel ? 'border-brand-600 ring-2 ring-brand-200' : 'border-slate-200',
                  !inMonth ? 'opacity-40' : '',
                  dayClosed ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:bg-slate-50',
                  isToday ? 'calendar-day today' : 'calendar-day',
                ].join(' ')}
                style={wash ? { backgroundImage: `linear-gradient(${wash}, ${wash})` } : undefined}
                aria-label={`Dia ${format(d, 'd')}${dayClosed ? ' fechado' : ''}${
                  markerTitle ? ` — ${markerTitle}` : ''
                }`}
                title={markerTitle}
              >
                <div className={`text-[13px] md:text-base font-medium ${isToday ? 'text-brand-700' : ''}`}>
                  {format(d, 'd')}
                </div>

                {bars.length > 0 && (
                  <div className="mt-0.5 md:mt-1 space-y-0.5 md:space-y-1 w-full">
                    {bars.slice(0, 3).map((apt) => {
                      const color =
                        apt.status === 'done' ? 'bg-emerald-500'
                        : apt.status === 'confirmed' ? 'bg-blue-600'
                        : 'bg-blue-300'; // open
                      return (
                        <div
                          key={apt.id}
                          className={['rounded-full w-full', 'h-0.5 md:h-1', color].join(' ')}
                        />
                      );
                    })}
                    {extra > 0 && (
                      <div className="text-[10px] text-slate-500">+{extra}</div>
                    )}
                  </div>
                )}

                {dayClosed && (
                  <div className="text-[10px] text-slate-500">
                    Fechado{isHoliday ? ' (feriado)' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda: Agendamentos (abertos), Confirmados, Concluído + Marcadores (descrição + cor) */}
        <div className="mt-3 md:mt-4 flex flex-wrap gap-2 text-[10px] md:text-xs legend-xs">
          <span
            className="badge"
            style={{ borderColor: '#93c5fd', color: '#1d4ed8', background: 'rgba(147,197,253,0.15)' }}
          >
            Agendamentos
          </span>
          <span className="badge badge-confirmed">Confirmados</span>
          <span className="badge badge-done">Concluído</span>

          {visibleMarkerBadges.map(({ desc, color }) => (
            <span
              key={`${desc}-${color}`}
              className="badge"
              style={{
                borderColor: color,
                color,
                background: hexToRgba(color, 0.12),
              }}
              title={desc}
            >
              {desc}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MonthCalendar;
