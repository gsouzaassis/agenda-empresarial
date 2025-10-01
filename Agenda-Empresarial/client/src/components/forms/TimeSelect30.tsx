// src/components/forms/TimeSelect30.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../state/store";

/* ----------------- helpers ----------------- */
const pad = (n: number) => String(n).padStart(2, "0");

function clampStep(n?: number) {
  const v = Math.floor(Number(n) || 0);
  if (!Number.isFinite(v) || v <= 0) return 30;
  return Math.min(60, Math.max(1, v));
}

function normalizeToStep(v: string, step: number) {
  const [h0, m0] = (v || "00:00").split(":").map((x) => parseInt(x || "0", 10));
  const H = Math.min(Math.max(Number.isFinite(h0) ? h0 : 0, 0), 23);
  const M = Math.min(Math.max(Number.isFinite(m0) ? m0 : 0, 0), 59);
  const s = clampStep(step);
  // “snap” para baixo no múltiplo do passo
  const MM = Math.floor(M / s) * s;
  return `${pad(H)}:${pad(MM)}`;
}

/** detecta apontador touch para decidir mobile nativo */
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

type MenuKind = "hour" | "minute";
type Pos = { left: number; top: number; width: number; estHeight: number };

/* ----------------- props ----------------- */
export type TimeSelect30Props = {
  value: string;
  onChange: (hhmm: string) => void;
  className?: string;        // wrapper
  buttonClassName?: string;  // botões (modo desktop)
  id?: string;
  name?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** força usar o dropdown desktop mesmo no celular */
  forceDesktop?: boolean;
  /** sobrescreve o passo (minutos); se omitido, é dinâmico pelo intervalo mínimo */
  stepMinutes?: number;
  "aria-label"?: string;
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
};

/* ----------------- componente ----------------- */
export default function TimeSelect30({
  value,
  onChange,
  className,
  buttonClassName,
  id,
  name,
  disabled,
  autoFocus,
  forceDesktop = false,
  stepMinutes,
  hourAriaLabel = "Hora",
  minuteAriaLabel = "Minutos",
  ...rest
}: TimeSelect30Props) {
  const { settings, services } = useApp();

  // ===== passo dinâmico pelo “intervalo mínimo” =====
  const dynamicStep = useMemo(() => {
    // 1) prop
    if (stepMinutes) return clampStep(stepMinutes);
    // 2) settings.minIntervalMinutes (se você tiver isso no store)
    const fromMin = clampStep((settings as any).minIntervalMinutes);
    if ((settings as any).minIntervalMinutes) return fromMin;
    // 3) settings.slotMinutes (padrão da agenda)
    const fromSlot = clampStep(settings.slotMinutes);
    if (settings.slotMinutes) return fromSlot;
    // 4) mínimo entre durações dos serviços
    const mins = (services ?? [])
      .map((s: any) => Number(s?.duracaoMin))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (mins.length) return clampStep(Math.min(...mins));
    // 5) fallback
    return 30;
  }, [stepMinutes, settings, services]);

  const isCoarse = useIsCoarsePointer();

  // minutos possíveis conforme passo
  const MINUTES = useMemo(() => {
    const arr: number[] = [];
    const s = dynamicStep;
    for (let mm = 0; mm < 60; mm += s) arr.push(mm);
    if (arr.length === 0) arr.push(0);
    return arr;
  }, [dynamicStep]);

  const normalized = normalizeToStep(value, dynamicStep);
  const [h, m] = normalized.split(":").map(Number);

  /* ----- MOBILE: input nativo ----- */
  if (isCoarse && !forceDesktop) {
    return (
      <div className={className} {...rest}>
        <input
          id={id}
          name={name}
          type="time"
          step={dynamicStep * 60}        // segundos
          value={`${pad(h)}:${pad(m)}`}
          onChange={(e) => onChange(normalizeToStep(e.target.value, dynamicStep))}
          disabled={disabled}
          className="border rounded-lg px-2 py-2 h-10 w-[120px] bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-300))]"
          aria-label={rest["aria-label"] || "Selecionar horário"}
        />
      </div>
    );
  }

  /* ----- DESKTOP: dropdown portalizado ----- */
  const hourBtnRef = useRef<HTMLButtonElement>(null);
  const minBtnRef  = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState<MenuKind | null>(null);
  const [pos, setPos]   = useState<Pos | null>(null);

  const HOURS   = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const MIN_STR = useMemo(() => MINUTES.map(pad), [MINUTES]);

  const baseBtn =
    "border rounded-lg px-2 py-1 h-9 leading-none bg-white text-left " +
    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-300))] " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const openMenu = (kind: MenuKind) => {
    if (disabled) return;
    const el = kind === "hour" ? hourBtnRef.current : minBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 56);
    const margin = 4;
    const estHeight =
      kind === "hour"
        ? Math.min(24 * 44 + 8, 320)
        : Math.min(MINUTES.length * 44 + 8, 280);
    let left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    let top  = r.bottom + margin;
    if (top + estHeight > window.innerHeight - 8) top = r.top - margin - estHeight;
    setPos({ left, top, width, estHeight });
    setOpen(kind);
  };

  useEffect(() => {
    if (!open) return;

    const onDocDown = (e: MouseEvent) => {
      const hb = hourBtnRef.current, mb = minBtnRef.current, menu = menuRef.current;
      const t = e.target as Node;
      if (hb?.contains(t) || mb?.contains(t) || menu?.contains(t)) return;
      setOpen(null);
    };

    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };

    // fecha ao rolar fora do menu; rolar dentro do menu mantém aberto
    const onScroll = (e: Event) => {
      const menu = menuRef.current;
      const t = e.target as Node | null;
      if (menu && t && (t === menu || menu.contains(t))) return;
      setOpen(null);
    };

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => { if (autoFocus) hourBtnRef.current?.focus(); }, [autoFocus]);

  const changeHour   = (HH: string) => { onChange(`${HH}:${pad(m)}`); setOpen(null); };
  const changeMinute = (MM: string) => { onChange(`${pad(h)}:${MM}`); setOpen(null); };

  return (
    <div className={["inline-flex items-center gap-1", className || ""].join(" ")} {...rest}>
      <button
        ref={hourBtnRef}
        id={id}
        name={name ? `${name}__hour` : undefined}
        type="button"
        className={[baseBtn, buttonClassName || ""].join(" ")}
        onClick={() => openMenu("hour")}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open === "hour"}
        aria-label={hourAriaLabel}
      >
        {pad(h)}
      </button>

      <span className="select-none">:</span>

      <button
        ref={minBtnRef}
        type="button"
        name={name ? `${name}__minute` : undefined}
        className={[baseBtn, buttonClassName || ""].join(" ")}
        onClick={() => openMenu("minute")}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open === "minute"}
        aria-label={minuteAriaLabel}
      >
        {pad(m)}
      </button>

      {open && pos &&
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
              borderRadius: 8,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
            }}
          >
            {(open === "hour" ? HOURS : MIN_STR).map((opt) => {
              const selected = (open === "hour" ? pad(h) : pad(m)) === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => (open === "hour" ? changeHour(opt) : changeMinute(opt))}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 12px",
                    fontSize: 14,
                    background: selected ? "hsl(var(--brand-50))" : "white",
                    color: selected ? "hsl(var(--brand-700))" : "inherit",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
