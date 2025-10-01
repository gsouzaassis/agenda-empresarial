// src/components/modals/NewAppointmentModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../state/store";
import TimeSelect30 from "../forms/TimeSelect30";
import { addHHmm } from "../../lib/date";

/* ---------- utils ---------- */
type Option = { value: string; label: string };

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const s1 = toMin(aStart), e1 = toMin(aEnd);
  const s2 = toMin(bStart), e2 = toMin(bEnd);
  return s1 < e2 && s2 < e1;
}
function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState<boolean>(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return false;
    try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
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

/* ---------- NiceSelect (desktop portalizado; mobile nativo) ---------- */
function NiceSelect({
  options, value, onChange, placeholder = "— selecionar —", className,
}: {
  options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const isCoarse = useIsCoarsePointer();

  // Mobile → nativo
  if (isCoarse) {
    return (
      <select
        className={["w-full border rounded-lg px-2 py-2", className || ""].join(" ")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  // Desktop → portalizado (sem deslocar)
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{left:number; top:number; width:number; estHeight:number} | null>(null);
  const current = options.find(o => o.value === value);

  const openMenu = () => {
    const el = btnRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 220);
    const margin = 6;
    const estHeight = Math.min(Math.max(options.length, 6) * 40 + 8, 320);
    let left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    let top  = r.bottom + margin;
    if (top + estHeight > window.innerHeight - 8) top = r.top - margin - estHeight;
    setPos({ left, top, width, estHeight });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node, b = btnRef.current, m = menuRef.current;
      if (b?.contains(t) || m?.contains(t)) return; setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = (e: Event) => {
      const m = menuRef.current, t = e.target as Node | null;
      if (m && t && (t === m || m.contains(t))) return; setOpen(false);
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
        className={["w-full border rounded-lg px-2 py-2 text-left bg-white", className || ""].join(" ")}
        onClick={openMenu}
      >
        {current ? current.label : <span className="text-slate-400">{placeholder}</span>}
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: "fixed", left: pos.left, top: pos.top, width: pos.width,
            maxHeight: pos.estHeight, overflowY: "auto", zIndex: 9999,
            background: "white", border: "1px solid rgb(226 232 240)", borderRadius: 10,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05)"
          }}
        >
          {options.map(o => {
            const sel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                onMouseDown={(e) => e.preventDefault()}
                className={["w-full text-left px-3 py-2 text-sm", sel ? "bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-700))]" : "hover:bg-slate-50"].join(" ")}
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

/* ---------- Modal: Novo Agendamento (centralizado) ---------- */
export function NewAppointmentModal({
  dateISO,
  start: initialStart,
  onClose,
}: {
  dateISO: string;
  start: string;
  onClose: () => void;
}) {
  const { services, clients, staff, appointments, settings } = useApp();

  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [staffId, setStaffId] = useState<string>("");
  const [start, setStart] = useState<string>(initialStart);
  const [err, setErr] = useState("");

  const svc = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const end = useMemo(() => addHHmm(start, svc?.duracaoMin ?? 30), [start, svc]);

  // options
  const serviceOpts: Option[] = services.map(s => ({ value: s.id, label: `${s.nome} · ${s.duracaoMin}min` }));
  const clientOpts:  Option[] = clients.map(c => ({ value: c.id, label: c.nome }));
  const staffOpts:   Option[] = [{ value: "", label: "(sem profissional)" }, ...staff.map(p => ({ value: p.id, label: p.nome }))];

  // validações iguais às do reagendamento
  const weekday = new Date((dateISO || toLocalISO(new Date())) + "T00:00:00").getDay();
  const ws = settings.workStart ?? "00:00";
  const we = settings.workEnd ?? "23:59";

  const allMarkers = (((settings as any).markers ?? []) as any[]);
  const holidayMarkers = allMarkers.filter(m => m.kind === "holiday");
  const legacyHolidays = ((settings as any).holidays ?? []) as any[];
  const isHoliday = (allMarkers.length ? holidayMarkers : legacyHolidays).some((h: any) =>
    h.annual ? dateISO.slice(5) === (h.dateISO || "").slice(5) : dateISO === h.dateISO
  );

  const dailyClosures = ((settings as any).dailyClosures ?? []) as { start: string; end: string }[];
  const weekdayClosures = ((settings as any).weekdayClosures ?? []) as { weekday: number; start: string; end: string }[];
  const fallsInDailyClosure = dailyClosures.some(c => overlap(start, end, c.start, c.end));
  const fallsInWeekdayClosure = weekdayClosures.filter(c=>c.weekday===weekday).some(c => overlap(start, end, c.start, c.end));

  function create() {
    setErr("");

    if (!serviceId) { setErr("Selecione um procedimento."); return; }
    if (!clientId)  { setErr("Selecione um cliente."); return; }

    if (start < ws || end > we) { setErr("Horário fora do período de funcionamento."); return; }
    if ((settings.blockedWeekdays ?? []).includes(weekday)) { setErr("Esse dia está fechado."); return; }
    if (isHoliday) { setErr("Esse dia é feriado (fechado)."); return; }

    if (fallsInDailyClosure || fallsInWeekdayClosure) {
      // aqui só avisa, diferente do reagendamento que pede confirmação
      setErr("O horário cai em um intervalo de fechamento.");
      return;
    }

    // conflito
    const conflicting = appointments
      .filter((a) => a.dateISO === dateISO && a.status !== "canceled")
      .some((a) => overlap(start, end, a.start, a.end));
    if (conflicting) { setErr("Conflito com outro agendamento no período."); return; }

    const payload = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      dateISO,
      start,
      end,
      serviceId,
      clientId,
      staffId: staffId || undefined,
      status: "open" as const,
    };

    const st: any = useApp.getState();
    if (typeof st.insertAppointment === "function") {
      st.insertAppointment(payload);
    } else if (typeof (useApp as any).setState === "function") {
      (useApp as any).setState((s: any) => ({ appointments: [...s.appointments, payload] }));
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-[520px]">
        <div
          className="
            mx-auto bg-white border border-slate-200 shadow-xl
            rounded-2xl w-full
            grid grid-rows-[auto_1fr_auto]
            max-h-[min(85dvh,680px)] overflow-hidden relative
          "
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">Novo agendamento — {dateISO} · {start} → {end}</div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-3 text-sm overflow-y-auto">
            {err && <div className="text-red-600">{err}</div>}

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Cliente</div>
              {clientOpts.length ? (
                <NiceSelect options={clientOpts} value={clientId} onChange={setClientId} />
              ) : (
                <div className="text-slate-500">Cadastre um cliente primeiro.</div>
              )}
            </label>

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Procedimento</div>
              {serviceOpts.length ? (
                <NiceSelect options={serviceOpts} value={serviceId} onChange={setServiceId} />
              ) : (
                <div className="text-slate-500">Cadastre um serviço primeiro.</div>
              )}
            </label>

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Profissional</div>
              <NiceSelect options={staffOpts} value={staffId} onChange={setStaffId} />
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
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={create} disabled={!serviceId || !clientId}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewAppointmentModal;
