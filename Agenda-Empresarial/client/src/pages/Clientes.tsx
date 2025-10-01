import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../state/store";
import EditClientModal from "../components/modals/EditClientModal";
import NewClientModal from "../components/modals/NewClientModal";

function initials(fullName: string) {
  const p = (fullName || "").trim().split(/\s+/).slice(0, 2);
  return p.map((s) => s[0]?.toUpperCase() ?? "").join("");
}

export default function ClientesPage() {
  const { clients, removeClient } = useApp();

  // Abre "Cadastrar cliente" quando o TopNav dispara o evento global
  const [openNew, setOpenNew] = useState(false);
  useEffect(() => {
    const handler = () => setOpenNew(true);
    // @ts-ignore custom event simples
    window.addEventListener("open-new-client", handler as EventListener);
    return () => {
      // @ts-ignore
      window.removeEventListener("open-new-client", handler as EventListener);
    };
  }, []);

  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c: any) =>
      [c.nome, c.cpfNif, c.telefone, c.email]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term))
    );
  }, [clients, q]);

  return (
    <div className="container-page grid grid-cols-1 gap-4">
      {/* Barra de ações */}
      <div className="card">
        <div className="card-header flex items-center justify-between gap-2">
          <div className="font-semibold">Clientes</div>
          <div className="flex items-center gap-2">
            <div className="relative w-64 max-w-full">
              <input
                className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm"
                placeholder="Buscar por nome, NIF, telemóvel, e-mail…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                data-testid="input-search-client"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
            </div>
            {/* Botão 'Cadastrar cliente' está no TopNav (aba Clientes) e dispara 'open-new-client'. */}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <div className="card-body">
          {clients.length === 0 && q === "" && (
            <div className="text-sm text-slate-500">Nenhum cliente cadastrado.</div>
          )}
          {clients.length > 0 && filtered.length === 0 && (
            <div className="text-sm text-slate-500">Nada encontrado para “{q}”.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((c: any) => {
              const subtitle = [c.cpfNif, c.telefone || "—", c.email || "—"]
                .filter(Boolean)
                .join(" · ");

              return (
                <div key={c.id} className="border rounded-2xl px-3 py-3 flex items-center gap-3">
                  {/* avatar/iniciais */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                    {initials(c.nome)}
                  </div>

                  {/* info */}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" data-testid={`text-client-name-${c.id}`}>
                      {c.nome}
                    </div>
                    <div className="text-xs text-slate-600 truncate">{subtitle}</div>
                    {c.observacoes && (
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">{c.observacoes}</div>
                    )}
                  </div>

                  {/* ações */}
                  <div className="ml-auto flex items-center gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(c.id)}>
                      Editar
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeClient(c.id)}
                      data-testid={`button-remove-client-${c.id}`}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingId && <EditClientModal clientId={editingId} onClose={() => setEditingId(null)} />}
      {openNew && <NewClientModal onClose={() => setOpenNew(false)} />}
    </div>
  );
}
