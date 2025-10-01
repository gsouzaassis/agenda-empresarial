// src/components/TopNav.tsx
import React, { useEffect, useState } from "react";

type TabKey = "agenda" | "clientes" | "servicos" | "relatorios" | "recibos";

export function TopNav({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  // Apenas controla visibilidade do botão principal (não trocamos rótulo via evento)
  const [allowTopButton, setAllowTopButton] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { visible?: boolean } | undefined;
      if (detail && typeof detail.visible === "boolean") setAllowTopButton(detail.visible);
    };
    window.addEventListener("toggle-settings", handler as EventListener);
    return () => window.removeEventListener("toggle-settings", handler as EventListener);
  }, []);

  // Dispara ação principal:
  // - Em Relatórios: exportação (a página escuta "open-settings")
  // - Em Agenda/Recibos: abre Ajustes (a página escuta "open-settings")
  const triggerTopAction = () => {
    // @ts-ignore
    window.dispatchEvent(new CustomEvent("open-settings"));
  };

  // Atalhos específicos
  const openNewClient = () => {
    // @ts-ignore
    window.dispatchEvent(new CustomEvent("open-new-client"));
  };
  const openNewService = () => {
    // @ts-ignore
    window.dispatchEvent(new CustomEvent("open-new-service"));
  };
  const openNewStaff = () => {
    // @ts-ignore
    window.dispatchEvent(new CustomEvent("open-new-staff"));
  };

  // Regras de exibição
  const showTopButton =
    allowTopButton && tab !== "clientes" && tab !== "servicos"; // sem botão principal em Clientes/Serviços
  const showNewClientButton = tab === "clientes";
  const showServicesActions = tab === "servicos";

  // Rótulo do botão principal por aba:
  // - Relatórios: "Exportar"
  // - Recibos (e demais): "Ajustes"
  const topButtonLabel = tab === "relatorios" ? "Exportar" : "Ajustes";

  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="container-page flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--brand-600))]" />
          <div className="font-semibold">Agenda Empresarial</div>
        </div>

        {/* Ações à direita */}
        <div className="flex items-center gap-2">
          {/* Botão principal (Ajustes/Exportar) */}
          {showTopButton && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-slate-200 hover:bg-slate-100"
              onClick={triggerTopAction}
              title={topButtonLabel}
              data-topnav={tab === "relatorios" ? "export" : "settings"}
            >
              {topButtonLabel}
            </button>
          )}

          {/* Só na aba Clientes */}
          {showNewClientButton && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-slate-200 hover:bg-slate-100"
              onClick={openNewClient}
              title="Cadastrar cliente"
            >
              Cadastrar cliente
            </button>
          )}

          {/* Só na aba Serviços — dois botões */}
          {showServicesActions && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-slate-200 hover:bg-slate-100"
                onClick={openNewService}
                title="Cadastrar serviço"
              >
                Cadastrar serviço
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-slate-200 hover:bg-slate-100"
                onClick={openNewStaff}
                title="Cadastrar profissional"
              >
                Cadastrar profissional
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopNav;
