import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  Map as MapIcon,
  UserRound,
  ChevronDown,
  LogOut,
  Landmark,
  TrendingUp,
  FileText,
  Wrench,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ViewState, Appointment } from '../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  hasSubmenu?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, collapsed, onClick, hasSubmenu }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group hover-lift ${active ? 'bg-slate-50 text-primary font-bold border-l-4 border-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
  >
    <div className={`shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
    </div>
    {!collapsed && (
      <span className="text-[11px] uppercase tracking-wide flex-1 text-left whitespace-nowrap overflow-hidden">
        {label}
      </span>
    )}
    {!collapsed && hasSubmenu && (
      <ChevronDown size={14} className={`text-slate-300 transition-transform ${active ? 'rotate-180' : ''}`} />
    )}
  </button>
);

interface SidebarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  appointments: Appointment[];
  logout: () => Promise<void>;
  user: any;
  role: string | null;
  isMobile: boolean;
}



const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isSidebarOpen,
  setIsSidebarOpen,
  appointments,
  logout,
  user,
  role,
  isMobile
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isFinancialOpen, setIsFinancialOpen] = React.useState(() => {
    return currentView === 'FINANCIAL' || currentView === 'FINANCIAL_REPORT';
  });
  const sidebarWidth = isMobile || isSidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-20';

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-400/10 backdrop-blur-md z-40 animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
        ${isSidebarOpen ? 'translate-x-0' : isMobile ? '-translate-x-full' : ''}
        ${sidebarWidth}
        bg-white border-r border-border-light flex flex-col shadow-sidebar transition-all duration-300 ease-in-out
      `}>
        {/* Branding Section */}
        <div className="p-6 h-[var(--navbar-height)] flex items-center gap-3 border-b border-border-light">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 border-2 border-primary rounded-lg flex items-center justify-center relative overflow-hidden shrink-0">
              {/* Simplified Logo representation based on the attachment */}
              <div className="absolute inset-0 bg-primary/5"></div>
              <div className="z-10 text-primary">
                <MapIcon size={24} strokeWidth={2.5} />
              </div>
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
                <span className="text-lg font-black text-slate-800 leading-none tracking-tighter">MetricaAgro</span>
                <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Geomensura</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* CATEGORY: PORTAL SEMAD */}
          <div className="space-y-1">
            <NavItem
              icon={<LayoutDashboard />}
              label="Dashboard"
              active={currentView === 'DASHBOARD'}
              collapsed={!isSidebarOpen}
              onClick={() => handleNavClick('DASHBOARD')}
            />
            <NavItem
              icon={<Calendar />}
              label="Agenda"
              active={currentView === 'CALENDAR'}
              collapsed={!isSidebarOpen}
              onClick={() => handleNavClick('CALENDAR')}
            />
          </div>

          <div className="space-y-1">
            <NavItem
              icon={<Briefcase />}
              label="Projetos"
              active={currentView === 'PROJECTS' || currentView === 'PROJECT_DETAILS'}
              collapsed={!isSidebarOpen}
              onClick={() => handleNavClick('PROJECTS')}
            />
          </div>

          <div className="space-y-1">
            {isSidebarOpen && <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Módulos</h3>}
            <NavItem icon={<Users />} label="Clientes" active={currentView === 'CLIENTS'} collapsed={!isSidebarOpen} onClick={() => handleNavClick('CLIENTS')} />
            <NavItem icon={<MapIcon />} label="Imóveis" active={currentView === 'PROPERTIES'} collapsed={!isSidebarOpen} onClick={() => handleNavClick('PROPERTIES')} />
            <NavItem icon={<UserRound />} label="Técnicos" active={currentView === 'PROFESSIONALS'} collapsed={!isSidebarOpen} onClick={() => handleNavClick('PROFESSIONALS')} />
            <NavItem icon={<Landmark />} label="Serventias" active={currentView === 'REGISTRIES'} collapsed={!isSidebarOpen} onClick={() => handleNavClick('REGISTRIES')} />
            <NavItem icon={<Wrench />} label="Serviços" active={currentView === 'SERVICES'} collapsed={!isSidebarOpen} onClick={() => handleNavClick('SERVICES')} />
          </div>

          {/* CATEGORY: FINANCEIRO (CONSOLIDADO) */}
          <div className="space-y-1">
            {isSidebarOpen && <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Financeiro</h3>}

            <button
              onClick={() => setIsFinancialOpen(!isFinancialOpen)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group hover:bg-slate-50 ${isFinancialOpen ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <div className={`shrink-0 transition-transform duration-200 ${isFinancialOpen ? 'scale-110' : 'group-hover:scale-110'}`}>
                <TrendingUp size={18} />
              </div>
              {isSidebarOpen && (
                <>
                  <span className="text-[11px] uppercase tracking-wide flex-1 text-left">Gestão Financeira</span>
                  <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${isFinancialOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {isFinancialOpen && isSidebarOpen && (
              <div className="relative ml-4 pl-4 border-l border-slate-100 space-y-1 animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => handleNavClick('FINANCIAL')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[11px] uppercase tracking-wide ${currentView === 'FINANCIAL' ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  <TrendingUp size={14} />
                  <span>Lançamentos</span>
                </button>
                <button
                  onClick={() => handleNavClick('FINANCIAL_REPORT')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[11px] uppercase tracking-wide ${currentView === 'FINANCIAL_REPORT' ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  <FileText size={14} />
                  <span>Relatórios</span>
                </button>
              </div>
            )}

            {/* Fallback for collapsed sidebar - single click to financial */}
            {!isSidebarOpen && (
              <NavItem
                icon={<TrendingUp />}
                label="Financeiro"
                active={currentView === 'FINANCIAL' || currentView === 'FINANCIAL_REPORT'}
                collapsed={true}
                onClick={() => handleNavClick('FINANCIAL')}
              />
            )}
          </div>

          {/* CATEGORY: DOCUMENTAL */}
          <div className="space-y-1">
            {isSidebarOpen && <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Modelos</h3>}
            <NavItem icon={<FileText />} label="Modelos de Itens" active={currentView === 'BUDGET_TEMPLATES'} collapsed={!isSidebarOpen} onClick={() => handleNavClick('BUDGET_TEMPLATES')} />
          </div>

          {/* CATEGORY: AUTENTICAÇÃO */}
          <div className="space-y-1 pt-4">
            {isSidebarOpen && <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Autenticação</h3>}
            <NavItem
              icon={<LogOut />}
              label="Sair"
              active={false}
              collapsed={!isSidebarOpen}
              onClick={() => setShowLogoutConfirm(true)}
            />
          </div>
        </nav>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-400/10 backdrop-blur-md"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <LogOut size={32} />
            </div>

            <div className="text-center space-y-2 mb-8">
              <h3 className="text-xl font-heading font-black text-slate- main tracking-tighter">Encerrar Sessão?</h3>
              <p className="text-sm text-slate-muted font-medium">Você será desconectado e precisará entrar novamente para acessar seus dados.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-3 bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={logout}
                className="px-6 py-3 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
