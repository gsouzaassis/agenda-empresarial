// src/components/modals/EditClientModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../state/store";

type Form = {
  nome: string;
  cpfNif: string;
  telefone: string;
  email: string;
  observacoes: string;
};

export default function EditClientModal({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const { clients, upsertClient } = useApp();
  const client = useMemo(() => clients.find((c: any) => c.id === clientId), [clients, clientId]);

  const [form, setForm] = useState<Form>({
    nome: client?.nome ?? "",
    cpfNif: client?.cpfNif ?? "",
    telefone: client?.telefone ?? "",
    email: client?.email ?? "",
    observacoes: client?.observacoes ?? "",
  });

  useEffect(() => {
    if (!client) return;
    setForm({
      nome: client.nome ?? "",
      cpfNif: client.cpfNif ?? "",
      telefone: client.telefone ?? "",
      email: client.email ?? "",
      observacoes: client.observacoes ?? "",
    });
  }, [client]);

  const canSave = form.nome.trim().length > 0;

  // Fechar com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Foco no primeiro campo ao abrir
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  function save() {
    if (!client || !canSave) return;
    const payload = {
      id: client.id,
      nome: form.nome.trim(),
      cpfNif: form.cpfNif.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      email: form.email.trim() || undefined,
      observacoes: form.observacoes.trim() || undefined,
    };
    upsertClient(payload as any);
    onClose();
  }

  if (!client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* painel centralizado */}
      <div className="relative w-full max-w-[560px]">
        <div className="mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl w-full grid grid-rows-[auto_1fr_auto] max-h-[min(85dvh,720px)] overflow-hidden relative">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">Editar cliente</div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-3 text-sm overflow-y-auto">
            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Nome completo</div>
              <input
                ref={firstInputRef}
                className="w-full border rounded-lg px-2 py-2"
                placeholder="Ex.: Maria Silva"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                data-testid="edit-input-client-name"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs text-slate-600 mb-1">NIF / CPF</div>
                <input
                  className="w-full border rounded-lg px-2 py-2"
                  placeholder="Ex.: 123.456.789-00"
                  value={form.cpfNif}
                  onChange={(e) => setForm((f) => ({ ...f, cpfNif: e.target.value }))}
                  data-testid="edit-input-client-cpf"
                />
              </label>
              <label className="block">
                <div className="text-xs text-slate-600 mb-1">Telemóvel</div>
                <input
                  className="w-full border rounded-lg px-2 py-2"
                  placeholder="Ex.: +351 900 000 000"
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  data-testid="edit-input-client-phone"
                />
              </label>
            </div>

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">E-mail</div>
              <input
                className="w-full border rounded-lg px-2 py-2"
                placeholder="Ex.: maria@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                data-testid="edit-input-client-email"
              />
            </label>

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Observações</div>
              <textarea
                className="w-full border rounded-lg px-2 py-2 min-h-[88px] resize-y"
                placeholder="Notas, preferências, restrições…"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                data-testid="edit-input-client-notes"
              />
            </label>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 bg-white">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={!canSave}
              data-testid="edit-button-save-client"
            >
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
