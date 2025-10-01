// src/pages/Servicos.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../state/store";

/* ========= utils ========= */
function fmtEUR(v: number) {
  if (Number.isNaN(v)) return "€0,00";
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
  } catch {
    return `€${v.toFixed(2)}`;
  }
}

/* ========= NiceSelect (desktop portalizado; mobile nativo) ========= */
type Option = { value: string; label: string };

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
        className={["w-full border rounded-lg px-2 py-2", className || ""].join(" ")}
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

  // Desktop → portalizado (sem deslocar)
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; estHeight: number } | null>(null);

  const current = options.find((o) => o.value === value);

  const openMenu = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 220);
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
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = (e: Event) => {
      const m = menuRef.current, t = e.target as Node | null;
      if (m && t && (t === m || m.contains(t))) return; // scroll dentro do menu → ignora
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
        className={["w-full border rounded-lg px-2 py-2 text-left bg-white", className || ""].join(" ")}
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
              boxShadow: "0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05)",
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
                    sel ? "bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-700))]" : "hover:bg-slate-50",
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

/* ========= página ========= */
type ServiceForm = { id?: string; nome: string; duracaoMin: string; preco: string; staffId: string };
type StaffForm = { id?: string; nome: string };

export default function ServicosPage() {
  const { services, upsertService, removeService, staff, upsertStaff, removeStaff } = useApp();

  // Busca/ordenação
  const [svcQuery, setSvcQuery] = useState("");
  const [stfQuery, setStfQuery] = useState("");
  const normalizedSvcQuery = svcQuery.trim().toLowerCase();
  const normalizedStfQuery = stfQuery.trim().toLowerCase();

  const sortedServices = useMemo(() => {
    const arr = [...services];
    arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    return normalizedSvcQuery
      ? arr.filter(
          (s) =>
            s.nome.toLowerCase().includes(normalizedSvcQuery) ||
            String(s.duracaoMin).includes(normalizedSvcQuery) ||
            String(s.preco).includes(normalizedSvcQuery)
        )
      : arr;
  }, [services, normalizedSvcQuery]);

  const sortedStaff = useMemo(() => {
    const arr = [...staff];
    arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    return normalizedStfQuery ? arr.filter((s) => s.nome.toLowerCase().includes(normalizedStfQuery)) : arr;
  }, [staff, normalizedStfQuery]);

  // Modais (centralizados)
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [svcForm, setSvcForm] = useState<ServiceForm>({ nome: "", duracaoMin: "60", preco: "60", staffId: "" });
  const [stfForm, setStfForm] = useState<StaffForm>({ nome: "" });

  // Eventos do TopNav
  useEffect(() => {
    const onOpenNewService = () => {
      setSvcForm({ nome: "", duracaoMin: "60", preco: "60", staffId: "" });
      setServiceModalOpen(true);
    };
    const onOpenNewStaff = () => {
      setStfForm({ nome: "" });
      setStaffModalOpen(true);
    };
    window.addEventListener("open-new-service", onOpenNewService);
    window.addEventListener("open-new-staff", onOpenNewStaff);
    return () => {
      window.removeEventListener("open-new-service", onOpenNewService);
      window.removeEventListener("open-new-staff", onOpenNewStaff);
    };
  }, []);

  // Salvar
  const handleSaveService = useCallback(
    (data: ServiceForm) => {
      const nome = data.nome.trim();
      if (!nome) return;
      const duracaoMin = Math.max(5, Number(data.duracaoMin) || 30);
      const preco = Math.max(0, Number(data.preco) || 0);
      upsertService({ id: data.id, nome, duracaoMin, preco, staffId: data.staffId || undefined });
      setServiceModalOpen(false);
    },
    [upsertService]
  );
  const handleSaveStaff = useCallback(
    (data: StaffForm) => {
      const nome = data.nome.trim();
      if (!nome) return;
      upsertStaff({ id: data.id, nome });
      setStaffModalOpen(false);
    },
    [upsertStaff]
  );

  // Abrir edição
  const openEditService = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setSvcForm({ id: s.id, nome: s.nome, duracaoMin: String(s.duracaoMin), preco: String(s.preco), staffId: s.staffId || "" });
    setServiceModalOpen(true);
  };
  const openEditStaff = (id: string) => {
    const p = staff.find((x) => x.id === id);
    if (!p) return;
    setStfForm({ id: p.id, nome: p.nome });
    setStaffModalOpen(true);
  };

  const staffOpts: Option[] = [{ value: "", label: "(sem profissional)" }, ...staff.map((p) => ({ value: p.id, label: p.nome }))];

  return (
    <div className="container-page grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Serviços */}
      <div className="card lg:col-span-2">
        <div className="card-header flex items-center justify-between gap-2">
          <div className="font-semibold">Serviços</div>
          <input
            className="border rounded-xl px-3 py-2 text-sm w-44"
            placeholder="Pesquisar…"
            value={svcQuery}
            onChange={(e) => setSvcQuery(e.target.value)}
            data-testid="input-service-search"
          />
        </div>
        <div className="card-body">
          {/* Cabeçalho de colunas */}
          <div className="hidden md:grid grid-cols-12 text-xs text-slate-500 px-2 pb-2">
            <div className="col-span-5">Nome do procedimento</div>
            <div className="col-span-2">Duração</div>
            <div className="col-span-2">Valor</div>
            <div className="col-span-2">Profissional</div>
            <div className="col-span-1 text-right">Ações</div>
          </div>

          {/* Lista */}
          <div className="divide-y">
            {sortedServices.map((s) => {
              const resp = s.staffId ? staff.find((p) => p.id === s.staffId) : undefined;
              return (
                <div key={s.id} className="py-3 grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                  <div className="md:col-span-5">
                    <div className="text-sm font-medium" data-testid={`text-service-name-${s.id}`}>
                      {s.nome}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-slate-600">{s.duracaoMin} min</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-slate-600">{fmtEUR(s.preco)}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-slate-600">{resp?.nome || "-"}</div>
                  </div>
                  <div className="md:col-span-1 flex md:justify-end gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditService(s.id)} data-testid={`button-edit-service-${s.id}`}>
                      Editar
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        if (confirm("Remover este serviço?")) removeService(s.id);
                      }}
                      data-testid={`button-remove-service-${s.id}`}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
            {sortedServices.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">Nenhum serviço encontrado.</div>}
          </div>
        </div>
      </div>

      {/* Profissionais/Equipes */}
      <div className="card">
        <div className="card-header flex items-center justify-between gap-2">
          <div className="font-semibold">Profissionais/Equipes</div>
          <input
            className="border rounded-xl px-3 py-2 text-sm w-44"
            placeholder="Pesquisar…"
            value={stfQuery}
            onChange={(e) => setStfQuery(e.target.value)}
            data-testid="input-staff-search"
          />
        </div>
        <div className="card-body">
          <div className="space-y-2">
            {sortedStaff.map((s) => (
              <div key={s.id} className="border rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-sm font-medium flex-1" data-testid={`text-staff-name-${s.id}`}>
                  {s.nome}
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditStaff(s.id)} data-testid={`button-edit-staff-${s.id}`}>
                    Editar
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (confirm("Remover este profissional/equipe?")) removeStaff(s.id);
                    }}
                    data-testid={`button-remove-staff-${s.id}`}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {sortedStaff.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">Nenhum profissional encontrado.</div>}
          </div>
        </div>
      </div>

      {/* ===== MODAL: Serviço (centralizado) ===== */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/30" onClick={() => setServiceModalOpen(false)} />
          <div className="relative w-full max-w-[520px]">
            <div className="mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl w-full grid grid-rows-[auto_1fr_auto] max-h-[min(85dvh,680px)] overflow-hidden relative">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="font-semibold">{svcForm.id ? "Editar serviço" : "Cadastrar serviço"}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setServiceModalOpen(false)}>
                  Fechar
                </button>
              </div>

              <div className="px-4 py-3 space-y-3 text-sm overflow-y-auto">
                <label className="block">
                  <div className="text-xs text-slate-600 mb-1">Nome do procedimento</div>
                  <input
                    className="w-full border rounded-lg px-2 py-2"
                    placeholder="Ex.: Consulta Padrão"
                    value={svcForm.nome}
                    onChange={(e) => setSvcForm((v) => ({ ...v, nome: e.target.value }))}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-xs text-slate-600 mb-1">Duração (min)</div>
                    <input
                      className="w-full border rounded-lg px-2 py-2"
                      type="number"
                      min={5}
                      step={5}
                      value={svcForm.duracaoMin}
                      onChange={(e) => setSvcForm((v) => ({ ...v, duracaoMin: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-600 mb-1">Valor (€)</div>
                    <input
                      className="w-full border rounded-lg px-2 py-2"
                      type="number"
                      min={0}
                      step={1}
                      value={svcForm.preco}
                      onChange={(e) => setSvcForm((v) => ({ ...v, preco: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="text-xs text-slate-600 mb-1">Profissional</div>
                  <NiceSelect options={staffOpts} value={svcForm.staffId} onChange={(v) => setSvcForm((f) => ({ ...f, staffId: v }))} />
                </label>
              </div>

              <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 bg-white">
                <button className="btn btn-ghost btn-sm" onClick={() => setServiceModalOpen(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleSaveService(svcForm)}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Profissional (centralizado) ===== */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/30" onClick={() => setStaffModalOpen(false)} />
          <div className="relative w-full max-w-[520px]">
            <div className="mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl w-full grid grid-rows-[auto_1fr_auto] max-h-[min(85dvh,680px)] overflow-hidden relative">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="font-semibold">{stfForm.id ? "Editar profissional" : "Cadastrar profissional"}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setStaffModalOpen(false)}>
                  Fechar
                </button>
              </div>

              <div className="px-4 py-3 space-y-3 text-sm overflow-y-auto">
                <label className="block">
                  <div className="text-xs text-slate-600 mb-1">Nome</div>
                  <input
                    className="w-full border rounded-lg px-2 py-2"
                    placeholder="Ex.: Profissional Principal"
                    value={stfForm.nome}
                    onChange={(e) => setStfForm((v) => ({ ...v, nome: e.target.value }))}
                  />
                </label>
              </div>

              <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 bg-white">
                <button className="btn btn-ghost btn-sm" onClick={() => setStaffModalOpen(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleSaveStaff(stfForm)}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
