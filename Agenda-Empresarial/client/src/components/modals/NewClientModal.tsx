// src/components/modals/NewClientModal.tsx
import React, { useEffect, useState } from "react";
import { useApp } from "../../state/store";

type Form = {
  nome: string;
  cpfNif: string;
  telefone: string;
  email: string;
  observacoes: string;
};

export default function NewClientModal({ onClose }: { onClose: () => void }) {
  const { upsertClient } = useApp();

  const [form, setForm] = useState<Form>({
    nome: "",
    cpfNif: "",
    telefone: "",
    email: "",
    observacoes: "",
  });

  const canSave = form.nome.trim().length > 0;

  // Fechar com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    if (!canSave) return;
    const payload = {
      nome: form.nome.trim(),
      cpfNif: form.cpfNif.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      email: form.email.trim() || undefined,
      observacoes: form.observacoes.trim() || undefined,
    };
    upsertClient(payload as any);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* painel centralizado */}
      <div className="relative w-full max-w-[560px]">
        <div className="mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl w-full grid grid-rows-[auto_1fr_auto] max-h-[min(85dvh,720px)] overflow-hidden relative">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">Cadastrar cliente</div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-3 text-sm overflow-y-auto">
            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Nome completo</div>
              <input
                className="w-full border rounded-lg px-2 py-2"
                placeholder="Ex.: Maria Silva"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                data-testid="input-client-name"
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
                  data-testid="input-client-cpf"
                />
              </label>
              <label className="block">
                <div className="text-xs text-slate-600 mb-1">Telemóvel</div>
                <input
                  className="w-full border rounded-lg px-2 py-2"
                  placeholder="Ex.: +351 900 000 000"
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  data-testid="input-client-phone"
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
                data-testid="input-client-email"
              />
            </label>

            <label className="block">
              <div className="text-xs text-slate-600 mb-1">Observações</div>
              <textarea
                className="w-full border rounded-lg px-2 py-2 min-h-[88px] resize-y"
                placeholder="Notas, preferências, restrições…"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                data-testid="input-client-notes"
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
              data-testid="button-save-client"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
