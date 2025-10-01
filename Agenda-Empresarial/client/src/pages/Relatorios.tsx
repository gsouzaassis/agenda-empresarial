// src/pages/Relatorios.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useApp } from "../state/store";

/* =========================================================
   Utils
========================================================= */
type Status = "open" | "confirmed" | "canceled" | "done";

function statusPT(s: Status) {
  switch (s) {
    case "open":
      return "Aberto";
    case "confirmed":
      return "Confirmado";
    case "canceled":
      return "Cancelado";
    case "done":
      return "Concluído";
    default:
      return s;
  }
}

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

/* =========================================================
   SmartDatePicker — bonito no desktop, nativo no mobile
   (portalizado; fecha ao selecionar/clicar fora/ESC/scroll)
========================================================= */
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
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <button
              className="px-2 py-1 rounded hover:bg-slate-100"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
              }
            >
              ‹
            </button>
            <div className="text-sm font-medium">
              {MONTHS[viewMonth.getMonth()]} de {viewMonth.getFullYear()}
            </div>
            <button
              className="px-2 py-1 rounded hover:bg-slate-100"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
              }
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pt-2 text-center text-[11px] text-slate-500">
            {WK.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

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

/* =========================================================
   NiceSelect (serviço/profissional)
========================================================= */
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

/* =========================================================
   Página Relatórios
   - KPI empilhados para alinhamento
   - Botão "Exportar" no TopNav (a página trata o evento open-settings)
========================================================= */
export default function RelatoriosPage() {
  const { appointments, services, clients, staff } = useApp();

  // Mostra o botão do TopNav e liga o clique ao exportCSV
  useEffect(() => {
    // @ts-ignore
    window.dispatchEvent(new CustomEvent("toggle-settings", { detail: { visible: true } }));
    const onTopAction = () => exportCSV();
    // @ts-ignore
    window.addEventListener("open-settings", onTopAction as EventListener);
    return () => {
      // @ts-ignore
      window.dispatchEvent(new CustomEvent("toggle-settings", { detail: { visible: false } }));
      // @ts-ignore
      window.removeEventListener("open-settings", onTopAction as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filtros
  const now = new Date();
  const [dateStart, setDateStart] = useState(toISODate(startOfMonth(now)));
  const [dateEnd, setDateEnd] = useState(toISODate(endOfMonth(now)));
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");

  function setRange(kind: "today" | "week" | "month" | "last30" | "last12m" | "total") {
    const n = new Date();
    if (kind === "today") {
      const iso = toISODate(n);
      setDateStart(iso);
      setDateEnd(iso);
    } else if (kind === "week") {
      setDateStart(toISODate(startOfWeek(n)));
      setDateEnd(toISODate(endOfWeek(n)));
    } else if (kind === "month") {
      setDateStart(toISODate(startOfMonth(n)));
      setDateEnd(toISODate(endOfMonth(n)));
    } else if (kind === "last30") {
      setDateStart(toISODate(addDays(n, -29)));
      setDateEnd(toISODate(n));
    } else if (kind === "last12m") {
      const s = new Date(n.getFullYear(), n.getMonth() - 11, 1);
      setDateStart(toISODate(s));
      setDateEnd(toISODate(endOfMonth(n)));
    } else if (kind === "total") {
      if (appointments.length === 0) return;
      const minISO = appointments.reduce(
        (min, a) => (a.dateISO < min ? a.dateISO : min),
        appointments[0].dateISO
      );
      const maxISO = appointments.reduce(
        (max, a) => (a.dateISO > max ? a.dateISO : max),
        appointments[0].dateISO
      );
      setDateStart(minISO);
      setDateEnd(maxISO);
    }
  }

  const filtered = useMemo(() => {
    const s = parseISO(dateStart);
    const e = parseISO(dateEnd);
    e.setHours(23, 59, 59, 999);
    return appointments.filter((a: any) => {
      const d = parseISO(a.dateISO);
      if (d < s || d > e) return false;
      if (serviceId && a.serviceId !== serviceId) return false;
      if (staffId && a.staffId !== staffId) return false;
      return true;
    });
  }, [appointments, dateStart, dateEnd, serviceId, staffId]);

  // métricas
  const sum = (arr: any[]) =>
    arr.reduce((acc, a) => {
      const svc = services.find((s: any) => s.id === a.serviceId);
      return acc + (svc?.preco ?? 0);
    }, 0);

  const m = {
    doneQty: filtered.filter((a: any) => a.status === "done").length,
    doneAmt: sum(filtered.filter((a: any) => a.status === "done")),
    confQty: filtered.filter((a: any) => a.status === "confirmed").length,
    confAmt: sum(filtered.filter((a: any) => a.status === "confirmed")),
    openQty: filtered.filter((a: any) => a.status === "open").length,
    openAmt: sum(filtered.filter((a: any) => a.status === "open")),
    cancQty: filtered.filter((a: any) => a.status === "canceled").length,
    cancAmt: sum(filtered.filter((a: any) => a.status === "canceled")),
  };

  // exportar CSV — agora com Status em PT e valor numérico (sem aspas) com vírgula
  function exportCSV() {
    const header = [
      "Data",
      "Hora início",
      "Hora fim",
      "Cliente",
      "Serviço",
      "Profissional",
      "Status",
      "Valor (€)",
    ];

    type Row = (string | { num: string })[];
    const rows: Row[] = filtered.map((a: any) => {
      const c = clients.find((x: any) => x.id === a.clientId);
      const s = services.find((x: any) => x.id === a.serviceId);
      const p = staff.find((x: any) => x.id === a.staffId);

      // valor com vírgula para Excel PT e SEM aspas para ser número
      const val = ((s?.preco ?? 0).toFixed(2)).replace(".", ",");

      return [
        format(parseISO(a.dateISO), "dd/MM/yyyy"),
        a.start,
        a.end,
        c?.nome ?? "",
        s?.nome ?? "",
        p?.nome ?? "",
        statusPT(a.status),
        { num: val }, // marcado como número
      ];
    });

    const needsQuote = (v: string) => /[;"\n]/.test(v); // separador é ';'
    const encode = (cell: string | { num: string }) => {
      if (typeof cell !== "string") {
        // número: não colocar aspas
        return cell.num;
      }
      const v = String(cell);
      return needsQuote(v) ? `"${v.replace(/"/g, '""')}"` : v;
    };

    const all = [header as Row, ...rows];
    const csv = all.map((r) => r.map(encode).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const serviceOpts: Option[] = [
    { value: "", label: "Todos" },
    ...services.map((s: any) => ({ value: s.id, label: s.nome })),
  ];
  const staffOpts: Option[] = [
    { value: "", label: "Todos" },
    ...staff.map((p: any) => ({ value: p.id, label: p.nome })),
  ];

  return (
    <div className="container-page grid grid-cols-1 gap-4">
      {/* Filtros */}
      <div className="card">
        <div className="card-header">
          <div className="font-semibold">Relatórios</div>
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
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("today")}>
                Hoje
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("week")}>
                Semana
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("month")}>
                Mês
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("last30")}>
                Últimos 30
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("last12m")}>
                Últimos 12m
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRange("total")}>
                Total
              </button>
            </div>
          </div>

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

      {/* KPIs — empilhados (quantidade em cima, receita embaixo) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI title="Concluídos" qty={m.doneQty} amount={m.doneAmt} />
        <KPI title="Confirmados" qty={m.confQty} amount={m.confAmt} hint="Receita prevista" />
        <KPI title="Em aberto" qty={m.openQty} amount={m.openAmt} hint="Receita prevista" />
        <KPI title="Cancelados" qty={m.cancQty} amount={m.cancAmt} hint="Receita perdida" />
      </div>

      {/* Detalhamento */}
      <div className="card">
        <div className="card-header">Detalhamento do período</div>
        <div className="card-body overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-sm text-slate-500">Sem registros para este filtro.</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-slate-200">
                <tr className="text-left text-sm text-slate-600">
                  <th className="py-2">Data</th>
                  <th className="py-2">Hora</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Serviço</th>
                  <th className="py-2">Profissional</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered
                  .slice()
                  .sort((a, b) =>
                    a.dateISO === b.dateISO
                      ? a.start.localeCompare(b.start)
                      : a.dateISO.localeCompare(b.dateISO)
                  )
                  .map((a) => {
                    const c = clients.find((x: any) => x.id === a.clientId);
                    const s = services.find((x: any) => x.id === a.serviceId);
                    const p = staff.find((x: any) => x.id === a.staffId);
                    return (
                      <tr key={a.id}>
                        <td className="py-2">{format(parseISO(a.dateISO), "dd/MM/yyyy")}</td>
                        <td className="py-2">
                          {a.start} - {a.end}
                        </td>
                        <td className="py-2">{c?.nome ?? "—"}</td>
                        <td className="py-2">{s?.nome ?? "—"}</td>
                        <td className="py-2">{p?.nome ?? "—"}</td>
                        <td className="py-2">{statusPT(a.status as Status)}</td>
                        <td className="py-2 text-right">{fmtEUR(s?.preco ?? 0)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   KPI Card (empilhado: Quantidade em cima, Receita embaixo)
========================================================= */
function KPI({
  title,
  qty,
  amount,
  hint,
}: {
  title: string;
  qty: number;
  amount: number;
  hint?: string; // "Receita prevista", "Receita perdida", etc.
}) {
  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <div className="card-body">
        {/* linha 1 */}
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] text-slate-500">Quantidade</div>
          <div className="text-xl font-semibold">{qty}</div>
        </div>
        {/* linha 2 */}
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-[11px] text-slate-500">{hint ?? "Receita"}</div>
          <div className="text-xl font-semibold">{fmtEUR(amount)}</div>
        </div>
      </div>
    </div>
  );
}
