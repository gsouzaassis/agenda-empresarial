import * as React from "react";

type TabKey = "agenda" | "clientes" | "servicos" | "relatorios" | "recibos";

const Icon = {
  agenda: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7 2v2M17 2v2M3 8h18M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  clientes: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M16 14a4 4 0 1 1-8 0" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  servicos: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M3 12h18M12 3v18" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  relatorios: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  recibos: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 7h8M8 11h8M8 15h5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
};

export default function MobileTabBar({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  const items: { key: TabKey; label: string }[] = [
    { key: "agenda", label: "Agenda" },
    { key: "clientes", label: "Clientes" },
    { key: "servicos", label: "Serviços" },
    { key: "relatorios", label: "Relatórios" },
    { key: "recibos", label: "Recibos" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-6px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-6xl mx-auto grid grid-cols-5">
        {items.map((i) => {
          const active = tab === i.key;
          return (
            <button
              key={i.key}
              onClick={() => setTab(i.key)}
              className="flex flex-col items-center justify-center py-2 gap-1 min-h-[58px]"
              aria-label={i.label}
            >
              <span
                className={[
                  "flex items-center gap-1 px-3 py-1.5 rounded-full",
                  "text-[13px] font-semibold",
                  active
                    ? "bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-700))] ring-1 ring-[hsl(var(--brand-200))]"
                    : "text-slate-600"
                ].join(" ")}
              >
                {Icon[i.key as keyof typeof Icon]}
                {i.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
