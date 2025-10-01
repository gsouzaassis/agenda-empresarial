import React, { useState } from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from './components/TopNav';
import AgendaPage from './pages/Agenda';
import ClientesPage from './pages/Clientes';
import ServicosPage from './pages/Servicos';
import RelatoriosPage from './pages/Relatorios';
import RecibosPage from './pages/Recibos';
import { useIsMobile } from "./hooks/use-mobile";
import MobileTabBar from "./components/navigation/MobileTabBar";

type TabKey = 'agenda' | 'clientes' | 'servicos' | 'relatorios' | 'recibos';

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('agenda');
  const isMobile = useIsMobile(); // true quando for celular, false no desktop

  const renderPage = () => {
    switch (activeTab) {
      case 'agenda':      return <AgendaPage />;
      case 'clientes':    return <ClientesPage />;
      case 'servicos':    return <ServicosPage />;
      case 'relatorios':  return <RelatoriosPage />;
      case 'recibos':     return <RecibosPage />;
      default:            return <AgendaPage />;
    }
  };

  return (
    <TooltipProvider>
      {/* espaço extra no mobile para não ficar atrás da barra */}
      <div className={`min-h-screen bg-slate-50 ${isMobile ? 'with-mobile-tabbar' : ''}`}>
        <TopNav tab={activeTab} setTab={setActiveTab} />

        <div className="flex min-h-[calc(100vh-64px)]">
          {/* Sidebar: escondida no mobile, visível do md pra cima */}
          <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 hidden md:block">
            <nav className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('agenda')}
                data-testid="nav-agenda"
                className={`sidebar-item w-full text-left ${activeTab === 'agenda' ? 'active' : ''}`}
                type="button"
              >
                <i className="fas fa-calendar-alt w-5" />
                <span>Agenda</span>
              </button>

              <button
                onClick={() => setActiveTab('clientes')}
                data-testid="nav-clientes"
                className={`sidebar-item w-full text-left ${activeTab === 'clientes' ? 'active' : ''}`}
                type="button"
              >
                <i className="fas fa-users w-5" />
                <span>Clientes</span>
              </button>

              <button
                onClick={() => setActiveTab('servicos')}
                data-testid="nav-servicos"
                className={`sidebar-item w-full text-left ${activeTab === 'servicos' ? 'active' : ''}`}
                type="button"
              >
                <i className="fas fa-briefcase w-5" />
                <span>Serviços</span>
              </button>

              <button
                onClick={() => setActiveTab('relatorios')}
                data-testid="nav-relatorios"
                className={`sidebar-item w-full text-left ${activeTab === 'relatorios' ? 'active' : ''}`}
                type="button"
              >
                <i className="fas fa-chart-bar w-5" />
                <span>Relatórios</span>
              </button>

              <button
                onClick={() => setActiveTab('recibos')}
                data-testid="nav-recibos"
                className={`sidebar-item w-full text-left ${activeTab === 'recibos' ? 'active' : ''}`}
                type="button"
              >
                <i className="fas fa-receipt w-5" />
                <span>Recibos</span>
              </button>
            </nav>
          </aside>

          {/* Conteúdo: overflow só no desktop (no mobile a página inteira rola) */}
          <main className={`flex-1 ${isMobile ? '' : 'overflow-auto'} bg-slate-50`}>
            {renderPage()}
          </main>
        </div>

        {/* Barra de abas no rodapé — somente no mobile */}
        {isMobile && (
          <MobileTabBar
            tab={activeTab}
            setTab={setActiveTab}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export default App;
