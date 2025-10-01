// src/components/modals/RescheduleModal.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../state/store";
import TimeSelect30 from "../forms/TimeSelect30";
import { addHHmm } from "../../lib/date";

/* ---------- utils ---------- */
function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const s1 = toMin(aStart),
    e1 = toMin(aEnd);
  const s2 = toMin(bStart),
    e2 = toMin(bEnd);
  return s1 < e2 && s2 < e1;
}
function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState<boolean>(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return false;
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!("matchMedia" in window)) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = () => setIsCoarse(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return isCoarse;
}

/* ---------- Select bonito (desktop portalizado; mobile nativo) ---------- */
type Option = { value: string; label: string };
function NiceSelect({
  options,
  value,
  onChange,
  placeholder = "— selecionar —",
  className,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const isCoarse = useIsCoarsePointer();

  // Mobile → nativo
  if (isCoarse) {
    return (
      <select
        className={["w-full border rounded-lg px-2 py-2", className || ""].join(
          " "
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  // Desktop → portalizado (sem deslocar, com scroll interno)
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
    estHeight: number;
  } | null>(null);

  const current = options.find((o) => o.value === value);

  const openMenu = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 200);
    const margin = 6;
    const estHeight = Math.min(Math.max(options.length, 6) * 40 + 8, 320);
    let left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    let top = r.bottom + margin;
    if (top + estHeight > window.innerHeight - 8) top = r.top - margin - estHeight;
    setPos({ left, top, width, estHeight });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node,
        b = btnRef.current,
        m = menuRef.current;
      if (b?.contains(t) || m?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // fecha apenas se o scroll não for dentro do menu
    const onScroll = (e: Event) => {
      const m = menuRef.current,
        t = e.target as Node | null;
      if (m && t && (t === m || m.contains(t))) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={[
          "w-full border rounded-lg px-2 py-2 text-left bg-white",
          className || "",
        ].join(" ")}
        onClick={openMenu}
      >
        {current ? current.label : <span className="text-slate-400">{placeholder}</span>}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              width: pos.width,
              maxHeight: pos.estHeight,
              overflowY: "auto",
              zIndex: 9999,
              background: "white",
              border: "1px solid rgb(226 232 240)",
              borderRadius: 10,
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05)",
            }}
          >
            {options.map((o) => {
              const sel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className={[
                    "w-full text-left px-3 py-2 text-sm",
                    sel
                      ? "bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-700))]"
                      : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  {o.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

/* ---------- Modal CENTRALIZADO ---------- */
export function RescheduleModal({
  appointmentId,
  onClose,
  onDone,
}: {
  appointmentId: string;
  onClose: () => void;
  onDone: (a: {
    dateISO: string;
    start: string;
    end: string;
    serviceId: string;
    status: "open";
  }) => void;
}) {
  const { appointments, services, settings } = useApp();
  const apt = appointments.find((a) => a.id === appointmentId);
  const [err, setErr] = useState("");

  const [dateISO, setDateISO] = useState(apt?.dateISO ?? toLocalISO(new Date()));
  const [serviceId, setServiceId] = useState(apt?.serviceId ?? services[0]?.id ?? "");
  const [start, setStart] = useState(apt?.start ?? settings.workStart ?? "09:00");

  const svc = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const end = useMemo(() => addHHmm(start, svc?.duracaoMin ?? 30), [start, svc]);

  const [confirmBlocked, setConfirmBlocked] = useState(false);
  if (!apt) return null;

  // Helpers
  const weekday = new Date(dateISO + "T00:00:00").getDay();
  const ws = settings.workStart ?? "00:00";
  const we = settings.workEnd ?? "23:59";

  // markers (feriados) com fallback legado
  const allMarkers = (((settings as any).markers ?? []) as any[]);
  const holidayMarkers = allMarkers.filter((m) => m.kind === "holiday");
  const legacyHolidays = ((settings as any).holidays ?? []) as any[];
  const isHoliday = (allMarkers.length ? holidayMarkers : legacyHolidays).some((h: any) =>
    h.annual ? dateISO.slice(5) === (h.dateISO || "").slice(5) : dateISO === h.dateISO
  );

  const dailyClosures = ((settings as any).dailyClosures ?? []) as {
    start: string;
    end: string;
  }[];
  const weekdayClosures = ((settings as any).weekdayClosures ?? []) as {
    weekday: number;
    start: string;
    end: string;
  }[];
  const fallsInDailyClosure = dailyClosures.some((c) => overlap(start, end, c.start, c.end));
  const fallsInWeekdayClosure = weekdayClosures
    .filter((c) => c.weekday === weekday)
    .some((c) => overlap(start, end, c.start, c.end));

  function submit(overrideBlocked = false) {
    setErr("");

    // Regras "duras"
    if (start < ws || end > we) {
      setErr("Horário fora do período de funcionamento.");
      return;
    }
    if ((settings.blockedWeekdays ?? []).includes(weekday)) {
      setErr("Esse dia está fechado.");
      return;
    }
    if (isHoliday) {
      setErr("Esse dia é feriado (fechado).");
      return;
    }

    // Fechamentos (dia aberto): confirmação
    const hitsClosure = fallsInDailyClosure || fallsInWeekdayClosure;
    if (hitsClosure && !overrideBlocked) {
      setConfirmBlocked(true);
      return;
    }

    // conflitos (ignorar o próprio agendamento e cancelados)
    const conflicting = appointments
      .filter((a) => a.id !== apt.id && a.dateISO === dateISO && a.status !== "canceled")
      .some((a) => overlap(start, end, a.start, a.end));
    if (conflicting) {
      setErr("Conflito com outro agendamento no período.");
      return;
    }

    const payload = { dateISO, start, end, serviceId, status: "open" as const };
    const st: any = useApp.getState();

    if (typeof st.updateAppointment === "function") {
      st.updateAppointment(apt.id, payload);
    } else if (typeof (useApp as any).setState === "function") {
      (useApp as any).setState((s: any) => ({
        appointments: s.appointments.map((x: any) => (x.id === apt.id ? { ...x, ...payload } : x)),
      }));
    }
    onDone(payload);
    onClose();
  }

  // opções do select
  const serviceOpts: Option[] = services.map((s) => ({
    value: s.id,
    label: `${s.nome} · ${s.duracaoMin}min`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Painel centralizado */}
      <div className="relative w-full max-w-[520px]">
        <div
          className="
            mx-auto bg-white border border-slate-200 shadow-xl
            rounded-2xl w-full
            grid grid-rows-[auto_1fr_auto]
            max-h-[min(85dvh,680px)] sm:max-h-[90vh]
            overflow-hidden relative
          "
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">
              Reagendar — {dateISO} · {start} → {end}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>

          {/* Body (rolável) */}
          <div className="px-4 py-3 space-y-3 text-sm overflow-y-auto">
            {err && <div className="text-red-600">{err}</div>}

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Procedimento</div>
              <NiceSelect options={serviceOpts} value={serviceId} onChange={(v) => setServiceId(v)} />
            </label>

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Data</div>
              <input
                type="date"
                className="w-full border rounded-lg px-2 py-2"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs text-slate-600 mb-1">Início</div>
                <TimeSelect30 value={start} onChange={setStart} />
              </label>
              <label className="block">
                <div className="text-xs text-slate-600 mb-1">Fim</div>
                <div className="border rounded-lg px-2 py-2 bg-slate-50">{end}</div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 bg-white">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => submit(false)}>
              Salvar
            </button>
          </div>

          {/* Confirmação de fechamento */}
          {confirmBlocked && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-[92%] max-w-md p-4">
                <div className="font-semibold mb-1">Reagendar em horário fechado?</div>
                <p className="text-sm text-slate-600 mb-3">
                  O novo horário cai em um intervalo de <strong>fechamento</strong> (ex.: almoço).
                  Deseja confirmar mesmo assim?
                </p>
                <div className="flex justify-end gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmBlocked(false)}>
                    Voltar
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => submit(true)}>
                    Reagendar mesmo assim
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RescheduleModal;
