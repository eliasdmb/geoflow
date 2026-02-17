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
  FileCheck,
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
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${active ? 'bg-slate-50 text-primary font-bold border-l-4 border-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
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
  const sidebarWidth = isMobile || isSidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-20';

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
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
              onClick={() => setCurrentView('DASHBOARD')}
            />
            <NavItem
              icon={<Calendar />}
              label="Agenda"
              active={currentView === 'CALENDAR'}
              collapsed={!isSidebarOpen}
              onClick={() => setCurrentView('CALENDAR')}
            />
          </div>

          <div className="space-y-1">
            <NavItem
              icon={<Briefcase />}
              label="Projetos"
              active={currentView === 'PROJECTS' || currentView === 'PROJECT_DETAILS'}
              collapsed={!isSidebarOpen}
              onClick={() => setCurrentView('PROJECTS')}
            />
          </div>

          <div className="space-y-1">
            {isSidebarOpen && <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Módulos</h3>}
            <NavItem icon={<Users />} label="Clientes" active={currentView === 'CLIENTS'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('CLIENTS')} />
            <NavItem icon={<MapIcon />} label="Imóveis" active={currentView === 'PROPERTIES'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('PROPERTIES')} />
            <NavItem icon={<UserRound />} label="Técnicos" active={currentView === 'PROFESSIONALS'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('PROFESSIONALS')} />
            <NavItem icon={<Landmark />} label="Serventias" active={currentView === 'REGISTRIES'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('REGISTRIES')} />
            <NavItem icon={<Wrench />} label="Serviços" active={currentView === 'SERVICES'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('SERVICES')} />
            <NavItem icon={<FileCheck />} label="Certificações" active={currentView === 'SIGEF_CERTIFICATIONS'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('SIGEF_CERTIFICATIONS')} />
            <NavItem icon={<TrendingUp />} label="Financeiro" active={currentView === 'FINANCIAL'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('FINANCIAL')} />
          </div>

          {/* CATEGORY: DOCUMENTAL */}
          <div className="space-y-1">
            {isSidebarOpen && <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Documental</h3>}
            <NavItem icon={<FileText />} label="Relatórios" active={currentView === 'FINANCIAL_REPORT'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('FINANCIAL_REPORT')} />
            <NavItem icon={<FileText />} label="Modelos" active={currentView === 'BUDGET_TEMPLATES'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('BUDGET_TEMPLATES')} />
          </div>

          {/* CATEGORY: AUTENTICAÇÃO */}
          <div className="space-y-1 pt-4">
            {isSidebarOpen && <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Autenticação</h3>}
            <NavItem
              icon={<LogOut />}
              label="Sair"
              active={false}
              collapsed={!isSidebarOpen}
              onClick={logout}
            />
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
