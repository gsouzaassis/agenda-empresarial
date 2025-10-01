// src/pages/Recibos.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useApp } from "../state/store";

/* =============== Utils =============== */
type Status = "open" | "confirmed" | "canceled" | "done";
function fmtEUR(n: number) {
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
      Number.isFinite(n) ? n : 0
    );
  } catch {
    return `€${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
  }
}
function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseISO(iso: string) {
  const [y, m, d] = (iso || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function startOfWeek(d: Date) {
  const dt = new Date(d);
  const dow = (dt.getDay() + 7) % 7; // 0=Dom
  return addDays(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()), -dow);
}
function endOfWeek(d: Date) {
  return addDays(startOfWeek(d), 6);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/* =============== Pointer detector (mobile vs desktop) =============== */
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

/* =============== SmartDatePicker (igual do Relatórios) =============== */
function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
const WK = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro"
];
function calendarMatrix(baseMonth: Date) {
  const first = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 7) % 7)); // domingo
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  return cells;
}
function SmartDatePicker({
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const isCoarse = useIsCoarsePointer();

  if (isCoarse) {
    return (
      <input
        type="date"
        className={["border rounded-xl px-3 py-2", className || ""].join(" ")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
    );
  }

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] =
    useState<{ left: number; top: number; width: number; estHeight: number } | null>(null);

  const selDate = value ? parseISO(value) : new Date();
  const [viewMonth, setViewMonth] = useState<Date>(new Date(selDate.getFullYear(), selDate.getMonth(), 1));

  const openMenu = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 260);
    const margin = 6;
    const estHeight = 360;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    let top = r.bottom + margin;
    if (top + estHeight > window.innerHeight - 8) top = r.top - margin - estHeight;
    setPos({ left, top, width, estHeight });
    setOpen(true);
    setViewMonth(new Date(selDate.getFullYear(), selDate.getMonth(), 1));
  };

  // fechar: fora / ESC / scroll / resize
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const b = btnRef.current;
      const m = menuRef.current;
      if (b?.contains(t) || m?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = (e: Event) => {
      const m = menuRef.current, t = e.target as Node | null;
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

  const cells = calendarMatrix(viewMonth);
  const today = new Date();
  const label = value ? format(parseISO(value), "dd/MM/yyyy") : "—";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        aria-label={ariaLabel}
        className={[
          "inline-flex items-center justify-between gap-2 border rounded-xl px-3 py-2 w-[160px] bg-white",
          className || "",
        ].join(" ")}
      >
        <span className="truncate">{label}</span>
        <span className="text-slate-400">🗓️</span>
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            width: Math.max(260, pos.width),
            zIndex: 9999,
            background: "white",
            border: "1px solid rgb(226 232 240)",
            borderRadius: 12,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,.12), 0 4px 6px -2px rgba(0,0,0,.06)",
            overflow: "hidden",
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* header */}
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <button
              className="px-2 py-1 rounded hover:bg-slate-100"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <div className="text-sm font-medium">
              {MONTHS[viewMonth.getMonth()]} de {viewMonth.getFullYear()}
            </div>
            <button
              className="px-2 py-1 rounded hover:bg-slate-100"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>

          {/* week labels — FIX: keys únicos com índice */}
          <div className="grid grid-cols-7 gap-1 px-3 pt-2 text-center text-[11px] text-slate-500">
            {WK.map((w, i) => (
              <div key={`${w}-${i}`}>{w}</div>
            ))}
          </div>

          {/* days */}
          <div className="grid grid-cols-7 gap-1 p-3 pt-1">
            {cells.map((d, i) => {
              const isOtherMonth = d.getMonth() !== viewMonth.getMonth();
              const selected = value ? sameDate(d, selDate) : false;
              const isToday = sameDate(d, today);
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(toISODate(d));
                    setOpen(false);
                  }}
                  className={[
                    "h-9 rounded-md text-sm",
                    isOtherMonth ? "text-slate-400" : "text-slate-700",
                    selected
                      ? "bg-[hsl(var(--brand-600))] text-white"
                      : isToday
                      ? "border border-[hsl(var(--brand-300))] bg-[hsl(var(--brand-50))]"
                      : "hover:bg-slate-100",
                  ].join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* footer */}
          <div className="px-3 pb-3">
            <button
              className="btn btn-ghost btn-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                const now = new Date();
                onChange(toISODate(now));
                setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                setOpen(false);
              }}
            >
              Hoje
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* =============== NiceSelect (portalizado) =============== */
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

  if (isCoarse) {
    return (
      <select
        className={["w-full border rounded-xl px-3 py-2 bg-white", className || ""].join(" ")}
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

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] =
    useState<{ left: number; top: number; width: number; estHeight: number } | null>(null);
  const current = options.find((o) => o.value === value);

  const openMenu = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 220);
    const margin = 6;
    const estHeight = Math.min(Math.max(options.length, 6) * 40 + 8, 280);
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
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
        className={["w-full border rounded-xl px-3 py-2 text-left bg-white", className || ""].join(
          " "
        )}
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
              borderRadius: 12,
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05)",
            }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                }}
                className={[
                  "w-full text-left px-3 py-2 text-sm",
                  o.value === value
                    ? "bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-700))]"
                    : "hover:bg-slate-50",
                ].join(" ")}
              >
                {o.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

/* =============== CenteredModal =============== */
function CenteredModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full grid grid-rows-[auto_1fr_auto] max-h-[min(85dvh,760px)] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">{title}</div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
          </div>
          <div className="px-4 py-3 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =============== Página Recibos =============== */
export default function RecibosPage() {
  const { appointments, services, clients, staff, settings } = useApp();

  // TopNav: mostrar botão Ajustes nesta aba
  useEffect(() => {
    // @ts-ignore
    window.dispatchEvent(new CustomEvent("toggle-settings", { detail: { visible: true } }));
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    // @ts-ignore
    window.addEventListener("open-settings", handler as EventListener);
    return () => {
      // @ts-ignore
      window.removeEventListener("open-settings", handler as EventListener);
    };
  }, []);

  // Filtros (datas com SmartDatePicker)
  const now = new Date();
  const [dateStart, setDateStart] = useState(toISODate(startOfMonth(now)));
  const [dateEnd, setDateEnd] = useState(toISODate(endOfMonth(now)));
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");

  function setRange(kind: "today" | "week" | "month" | "last30" | "last12m" | "total") {
    const n = new Date();
    if (kind === "today") {
      const iso = toISODate(n); setDateStart(iso); setDateEnd(iso);
    } else if (kind === "week") {
      setDateStart(toISODate(startOfWeek(n))); setDateEnd(toISODate(endOfWeek(n)));
    } else if (kind === "month") {
      setDateStart(toISODate(startOfMonth(n))); setDateEnd(toISODate(endOfMonth(n)));
    } else if (kind === "last30") {
      setDateStart(toISODate(addDays(n, -29))); setDateEnd(toISODate(n));
    } else if (kind === "last12m") {
      const s = new Date(n.getFullYear(), n.getMonth() - 11, 1);
      setDateStart(toISODate(s)); setDateEnd(toISODate(endOfMonth(n)));
    } else if (kind === "total") {
      if (appointments.length === 0) return;
      const minISO = appointments.reduce((min, a) => (a.dateISO < min ? a.dateISO : min), appointments[0].dateISO);
      const maxISO = appointments.reduce((max, a) => (a.dateISO > max ? a.dateISO : max), appointments[0].dateISO);
      setDateStart(minISO); setDateEnd(maxISO);
    }
  }

  // Base (ignorando cancelados nos recibos)
  const base = useMemo(() => {
    const s = parseISO(dateStart); const e = parseISO(dateEnd); e.setHours(23,59,59,999);
    return appointments.filter((a: any) => {
      const d = parseISO(a.dateISO);
      if (d < s || d > e) return false;
      if (serviceId && a.serviceId !== serviceId) return false;
      if (staffId && a.staffId !== staffId) return false;
      return a.status !== "canceled";
    });
  }, [appointments, dateStart, dateEnd, serviceId, staffId]);

  const pendentes = useMemo(
    () => base.filter((a: any) => a.status === "open" || a.status === "confirmed"),
    [base]
  );
  const concluidos = useMemo(() => base.filter((a: any) => a.status === "done"), [base]);

  // ações
  const [finishFor, setFinishFor] = useState<string | null>(null);
  const [previewFor, setPreviewFor] = useState<string | null>(null);

  const serviceOpts: Option[] = [{ value: "", label: "Todos" }, ...services.map((s: any) => ({ value: s.id, label: s.nome }))];
  const staffOpts: Option[] = [{ value: "", label: "Todos" }, ...staff.map((p: any) => ({ value: p.id, label: p.nome }))];

  return (
    <div className="container-page grid grid-cols-1 gap-4">
      {/* Filtros */}
      <div className="card">
        <div className="card-header flex items-center justify-between gap-2">
          <div className="font-semibold">Recibos</div>
        </div>
        <div className="card-body space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <div className="text-xs text-slate-600 mb-1">Início</div>
              <SmartDatePicker value={dateStart} onChange={setDateStart} aria-label="Início" />
            </label>
            <label className="text-sm">
              <div className="text-xs text-slate-600 mb-1">Fim</div>
              <SmartDatePicker value={dateEnd} onChange={setDateEnd} aria-label="Fim" />
            </label>

            <div className="flex flex-wrap gap-2 ml-auto">
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("today")}>Hoje</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("week")}>Semana</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("month")}>Mês</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("last30")}>Últimos 30</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("last12m")}>Últimos 12m</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("total")}>Total</button>
            </div>
          </div>

          {/* Selects (portalizados) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2">
              <div className="text-xs text-slate-600 w-24">Serviço</div>
              <div className="relative overflow-visible flex-1">
                <NiceSelect options={serviceOpts} value={serviceId} onChange={setServiceId} />
              </div>
            </label>

            <label className="flex items-center gap-2">
              <div className="text-xs text-slate-600 w-24">Profissional</div>
              <div className="relative overflow-visible flex-1">
                <NiceSelect options={staffOpts} value={staffId} onChange={setStaffId} />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Pendentes */}
      <div className="card">
        <div className="card-header font-semibold">Pendentes</div>
        <div className="card-body">
          {pendentes.length === 0 ? (
            <div className="text-sm text-slate-500">Nada pendente no período selecionado.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendentes
                .slice()
                .sort((a, b) =>
                  a.dateISO === b.dateISO ? a.start.localeCompare(b.start) : a.dateISO.localeCompare(b.dateISO)
                )
                .map((a) => {
                  const svc = services.find((s: any) => s.id === a.serviceId);
                  const cli = clients.find((c: any) => c.id === a.clientId);
                  const pro = staff.find((p: any) => p.id === a.staffId);
                  return (
                    <div key={a.id} className="border rounded-2xl p-3 flex flex-wrap items-center gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {format(new Date(a.dateISO), "dd/MM/yyyy")} · {a.start} - {a.end}
                        </div>
                        <div className="text-xs text-slate-600">
                          {cli?.nome ?? "Cliente"} · {svc?.nome ?? "Serviço"} · {svc?.duracaoMin ?? 0}min
                          {pro?.nome ? ` · ${pro.nome}` : ""}
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-xs text-slate-500">{a.status === "open" ? "Aberto" : "Confirmado"}</div>
                        <div className="font-semibold">{fmtEUR(svc?.preco ?? 0)}</div>
                      </div>
                      <div className="w-full sm:w-auto sm:ml-auto flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={() => setFinishFor(a.id)}>
                          Concluir / Registrar pagamento
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Concluídos */}
      <div className="card">
        <div className="card-header font-semibold">Concluídos</div>
        <div className="card-body">
          {concluidos.length === 0 ? (
            <div className="text-sm text-slate-500">Nenhum recibo concluído neste período.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {concluidos
                .slice()
                .sort((a, b) =>
                  a.dateISO === b.dateISO ? a.start.localeCompare(b.start) : a.dateISO.localeCompare(b.dateISO)
                )
                .map((a) => {
                  const svc = services.find((s: any) => s.id === a.serviceId);
                  const cli = clients.find((c: any) => c.id === a.clientId);
                  const pro = staff.find((p: any) => p.id === a.staffId);
                  const price = (a as any).finalPrice ?? svc?.preco ?? 0;
                  return (
                    <div key={a.id} className="border rounded-2xl p-3 flex flex-wrap items-center gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {format(new Date(a.dateISO), "dd/MM/yyyy")} · {a.start} - {a.end}
                        </div>
                        <div className="text-xs text-slate-600">
                          {cli?.nome ?? "Cliente"} · {svc?.nome ?? "Serviço"} · {svc?.duracaoMin ?? 0}min
                          {pro?.nome ? ` · ${pro.nome}` : ""}
                        </div>
                        {(a as any).discountValue ? (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Desconto: {fmtEUR((a as any).discountValue)}
                            {(a as any).discountReason ? ` — ${(a as any).discountReason}` : ""}
                          </div>
                        ) : null}
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-xs text-slate-500">Pago</div>
                        <div className="font-semibold">{fmtEUR(price)}</div>
                      </div>
                      <div className="w-full sm:w-auto sm:ml-auto flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setFinishFor(a.id)}>
                          Editar recibo
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPreviewFor(a.id)}>
                          Visualizar/Imprimir
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {finishFor && <FinishReceiptModal appointmentId={finishFor} onClose={() => setFinishFor(null)} />}
      {previewFor && <ReceiptPreviewModal appointmentId={previewFor} onClose={() => setPreviewFor(null)} />}
      {settingsOpen && <ReceiptSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

/* =============== Modal: concluir/editar recibo =============== */
function FinishReceiptModal({ appointmentId, onClose }: { appointmentId: string; onClose: () => void }) {
  const { appointments, services } = useApp();
  const apt = appointments.find((a: any) => a.id === appointmentId);
  const svc = services.find((s: any) => s.id === apt?.serviceId);
  const base = svc?.preco ?? 0;

  const [method, setMethod] = useState<string>((apt as any)?.paymentMethod ?? "Dinheiro");
  const [discountMode, setDiscountMode] = useState<"none" | "fixed" | "percent">(
    (apt as any)?.discountValue ? "fixed" : "none"
  );
  const [discountValue, setDiscountValue] = useState<number>((apt as any)?.discountValue ?? 0);
  const [discountReason, setDiscountReason] = useState<string>((apt as any)?.discountReason ?? "");
  const [note, setNote] = useState<string>((apt as any)?.receiptNote ?? "");

  const finalPrice =
    discountMode === "none"
      ? base
      : discountMode === "fixed"
      ? Math.max(0, base - (Number(discountValue) || 0))
      : Math.max(0, base - (base * (Number(discountValue) || 0)) / 100);

  function save() {
    const st: any = useApp.getState();
    const payload: any = {
      status: "done",
      paymentMethod: method,
      discountValue:
        discountMode === "none"
          ? 0
          : discountMode === "fixed"
          ? Number(discountValue) || 0
          : Math.round(((base * (Number(discountValue) || 0)) / 100) * 100) / 100,
      discountReason: discountMode === "none" ? "" : discountReason,
      receiptNote: note,
      finalPrice,
      paidAt: new Date().toISOString(),
    };

    if (typeof st.updateAppointment === "function") {
      st.updateAppointment(appointmentId, payload);
    } else if (typeof (useApp as any).setState === "function") {
      (useApp as any).setState((s: any) => ({
        appointments: s.appointments.map((x: any) => (x.id === appointmentId ? { ...x, ...payload } : x)),
      }));
    }
    onClose();
  }

  if (!apt) return null;

  const payOpts: Option[] = [
    { value: "Dinheiro", label: "Dinheiro" },
    { value: "Cartão (Multibanco)", label: "Cartão (Multibanco)" },
    { value: "MB Way", label: "MB Way" },
    { value: "Transferência bancária", label: "Transferência bancária" },
    { value: "Outro", label: "Outro" },
  ];
  const discountOpts: Option[] = [
    { value: "none", label: "Sem desconto" },
    { value: "fixed", label: "Valor (€)" },
    { value: "percent", label: "Percentual (%)" },
  ];

  return (
    <CenteredModal title="Registrar pagamento" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-600 mb-1">Serviço</div>
            <div className="border rounded-xl px-3 py-2 bg-slate-50">{svc?.nome ?? "Serviço"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Valor base</div>
            <div className="border rounded-xl px-3 py-2 bg-slate-50">{fmtEUR(base)}</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-600 mb-1">Forma de pagamento</div>
          <div className="relative overflow-visible">
            <NiceSelect options={payOpts} value={method} onChange={setMethod} />
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-600 mb-1">Desconto</div>
          <div className="grid grid-cols-[1fr_1fr] gap-2 items-center">
            <div className="relative overflow-visible">
              <NiceSelect options={discountOpts} value={discountMode} onChange={(v) => setDiscountMode(v as any)} />
            </div>
            <input
              type="number"
              step={discountMode === "percent" ? 1 : 0.01}
              min={0}
              className="border rounded-xl px-3 py-2"
              placeholder={discountMode === "percent" ? "0–100" : "0,00"}
              disabled={discountMode === "none"}
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
            />
          </div>
          {discountMode !== "none" && (
            <input
              className="border rounded-xl px-3 py-2 w-full mt-2"
              placeholder="Motivo do desconto (opcional)"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />
          )}
        </div>

        <div>
          <div className="text-xs text-slate-600 mb-1">Observações (opcional)</div>
          <textarea
            className="border rounded-xl px-3 py-2 w-full"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Informações adicionais para aparecer no recibo…"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border">
          <div className="text-xs text-slate-600">Valor final</div>
          <div className="text-xl font-semibold">{fmtEUR(finalPrice)}</div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save}>Salvar & Concluir</button>
      </div>
    </CenteredModal>
  );
}

/* =============== Modal: visualização/print =============== */
function ReceiptPreviewModal({ appointmentId, onClose }: { appointmentId: string; onClose: () => void }) {
  const { appointments, services, clients, staff, settings } = useApp();
  const apt = appointments.find((a: any) => a.id === appointmentId);
  const svc = services.find((s: any) => s.id === apt?.serviceId);
  const cli = clients.find((c: any) => c.id === apt?.clientId);
  const pro = staff.find((p: any) => p.id === apt?.staffId);
  const cfg = (settings as any)?.receipt ?? {};
  if (!apt) return null;

  const price = (apt as any).finalPrice ?? svc?.preco ?? 0;

  function printNow() {
    const win = window.open("", "_blank");
    if (!win) return;

    const logo = cfg.logoDataUrl ? `<img src="${cfg.logoDataUrl}" style="height:56px;object-fit:contain"/>` : "";

    win.document.write(`
      <!doctype html><html><head><meta charset="utf-8" />
      <title>Recibo</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial; padding:24px; color:#0f172a}
        .wrap{max-width:720px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;padding:24px}
        .row{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}
        .muted{color:#64748b;font-size:12px}
        h1{font-size:18px;margin:0 0 8px 0}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:14px}
        .right{text-align:right}.total{font-weight:600}
        @media print {.no-print{display:none}}
      </style></head><body>
      <div class="wrap">
        <div class="row">
          <div>
            ${logo}
            <div><strong>${cfg.businessName ?? "Estabelecimento"}</strong></div>
            <div class="muted">${[cfg.taxId, cfg.address, cfg.phone, cfg.email].filter(Boolean).join(" · ")}</div>
          </div>
          <div style="text-align:right">
            <h1>Recibo</h1>
            <div class="muted">#${apt.id.slice(0, 8)}</div>
            <div class="muted">${format(new Date(apt.paidAt ?? apt.dateISO), "dd/MM/yyyy")}</div>
          </div>
        </div>

        <div style="margin-top:16px">
          <div><strong>Cliente:</strong> ${cli?.nome ?? "—"}</div>
          <div class="muted">${[cli?.cpfNif, cli?.email, cli?.telefone].filter(Boolean).join(" · ")}</div>
        </div>

        <table>
          <thead><tr><th>Serviço</th><th>Duração</th><th class="right">Valor</th></tr></thead>
          <tbody>
            <tr>
              <td>${svc?.nome ?? "Serviço"}</td>
              <td>${svc?.duracaoMin ?? 0} min</td>
              <td class="right">${fmtEUR(svc?.preco ?? 0)}</td>
            </tr>
            ${
              (apt as any).discountValue
                ? `<tr><td colspan="2">Desconto${(apt as any).discountReason ? ` — ${(apt as any).discountReason}` : ""}</td><td class="right">- ${fmtEUR((apt as any).discountValue)}</td></tr>`
                : ""
            }
            <tr><td colspan="2" class="total">Total</td><td class="right total">${fmtEUR(price)}</td></tr>
          </tbody>
        </table>

        <div style="margin-top:12px" class="muted">
          Profissional: ${pro?.nome ?? "—"} · Pagamento: ${(apt as any).paymentMethod ?? "—"}
        </div>

        ${(apt as any).receiptNote ? `<div style="margin-top:12px"><strong>Observações:</strong><div class="muted">${(apt as any).receiptNote}</div></div>` : ""}

        <div style="margin-top:24px" class="muted">Obrigado pela preferência!</div>
      </div>

      <div class="no-print" style="text-align:center;margin-top:16px">
        <button onclick="window.print()" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer">Imprimir / Salvar PDF</button>
      </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 150);
  }

  return (
    <CenteredModal title="Visualizar recibo" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium">{cfg.businessName ?? "Estabelecimento"}</div>
            <div className="text-xs text-slate-500">
              {[cfg.taxId, cfg.phone, cfg.email].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Recibo</div>
            <div className="font-medium">#{apt.id.slice(0, 8)}</div>
            <div className="text-xs text-slate-500">
              {format(new Date((apt as any).paidAt ?? apt.dateISO), "dd/MM/yyyy")}
            </div>
          </div>
        </div>

        <div className="mt-2 p-3 rounded-xl bg-slate-50 border">
          <div className="text-xs text-slate-600">Cliente</div>
          <div className="font-medium">{cli?.nome ?? "—"}</div>
          <div className="text-xs text-slate-500">
            {[cli?.cpfNif, cli?.email, cli?.telefone].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs text-slate-600">
                <th className="py-2 px-3">Serviço</th>
                <th className="py-2 px-3">Duração</th>
                <th className="py-2 px-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="py-2 px-3">{svc?.nome ?? "Serviço"}</td>
                <td className="py-2 px-3">{svc?.duracaoMin ?? 0} min</td>
                <td className="py-2 px-3 text-right">{fmtEUR(svc?.preco ?? 0)}</td>
              </tr>
              {(apt as any).discountValue ? (
                <tr className="border-t">
                  <td className="py-2 px-3" colSpan={2}>
                    Desconto {(apt as any).discountReason ? `— ${(apt as any).discountReason}` : ""}
                  </td>
                  <td className="py-2 px-3 text-right">- {fmtEUR((apt as any).discountValue)}</td>
                </tr>
              ) : null}
              <tr className="border-t">
                <td className="py-2 px-3 font-semibold" colSpan={2}>Total</td>
                <td className="py-2 px-3 font-semibold text-right">{fmtEUR(price)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-xs text-slate-500">
          Profissional: {pro?.nome ?? "—"} · Pagamento: {(apt as any).paymentMethod ?? "—"}
        </div>

        {(apt as any).receiptNote && (
          <div className="text-xs text-slate-600">
            <div className="font-medium">Observações</div>
            <div className="text-slate-500">{(apt as any).receiptNote}</div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        <button className="btn btn-primary" onClick={printNow}>Imprimir / Salvar PDF</button>
      </div>
    </CenteredModal>
  );
}

/* =============== Modal: ajustes do recibo (logo e dados) =============== */
function ReceiptSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings } = useApp();
  const cfg = (settings as any)?.receipt ?? {};
  const [businessName, setBusinessName] = useState<string>(cfg.businessName ?? "");
  const [taxId, setTaxId] = useState<string>(cfg.taxId ?? "");
  const [address, setAddress] = useState<string>(cfg.address ?? "");
  const [phone, setPhone] = useState<string>(cfg.phone ?? "");
  const [email, setEmail] = useState<string>(cfg.email ?? "");
  const [logoDataUrl, setLogoDataUrl] = useState<string>(cfg.logoDataUrl ?? "");

  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  function save() {
    const st: any = useApp.getState();
    const next = { receipt: { businessName, taxId, address, phone, email, logoDataUrl } };
    if (typeof st.updateSettings === "function") st.updateSettings(next);
    else if (typeof (useApp as any).setState === "function")
      (useApp as any).setState((s: any) => ({ settings: { ...s.settings, ...next } }));
    onClose();
  }

  return (
    <CenteredModal title="Ajustes de recibo" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 items-start">
          <div className="text-xs text-slate-600">Logo</div>
          <div className="space-y-2">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="h-14 object-contain rounded-md border border-slate-200 bg-white p-2" />
            ) : (
              <div className="h-14 rounded-md border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500">
                Sem logo
              </div>
            )}
            <input type="file" accept="image/*" onChange={pickLogo} />
          </div>
        </div>

        <label className="block">
          <div className="text-xs text-slate-600 mb-1">Nome do estabelecimento</div>
          <input className="border rounded-xl px-3 py-2 w-full" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-xs text-slate-600 mb-1">NIF/Tax ID</div>
          <input className="border rounded-xl px-3 py-2 w-full" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-xs text-slate-600 mb-1">Endereço</div>
          <input className="border rounded-xl px-3 py-2 w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs text-slate-600 mb-1">Telefone</div>
            <input className="border rounded-xl px-3 py-2 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block">
            <div className="text-xs text-slate-600 mb-1">E-mail</div>
            <input className="border rounded-xl px-3 py-2 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save}>Salvar</button>
      </div>
    </CenteredModal>
  );
}
