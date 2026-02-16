import React from 'react';
import {
    Menu,
    Search,
    Bell,
    Lock,
    ChevronRight,
    User as UserIcon
} from 'lucide-react';
import { ViewState } from '../types';

interface NavbarProps {
    currentView: ViewState;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    user: any;
    onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
    currentView,
    isSidebarOpen,
    setIsSidebarOpen,
    user,
    onLogout
}) => {
    // Breadcrumb logic
    const getBreadcrumbs = () => {
        const crumbs = [{ label: 'Página Inicial', active: false }];

        switch (currentView) {
            case 'DASHBOARD':
                crumbs.push({ label: 'Dashboard', active: true });
                break;
            case 'PROJECTS':
            case 'PROJECT_DETAILS':
                crumbs.push({ label: 'Projetos', active: true });
                break;
            case 'FINANCIAL':
                crumbs.push({ label: 'Financeiro', active: true });
                break;
            case 'CLIENTS':
                crumbs.push({ label: 'Clientes', active: true });
                break;
            case 'PROPERTIES':
                crumbs.push({ label: 'Imóveis', active: true });
                break;
            case 'PROFESSIONALS':
                crumbs.push({ label: 'Técnicos', active: true });
                break;
            case 'REGISTRIES':
                crumbs.push({ label: 'Serventias', active: true });
                break;
            case 'SERVICES':
                crumbs.push({ label: 'Serviços', active: true });
                break;
            case 'SIGEF_CERTIFICATIONS':
                crumbs.push({ label: 'Certificações', active: true });
                break;
            case 'FINANCIAL_REPORT':
                crumbs.push({ label: 'Relatórios', active: true });
                break;
            case 'BUDGET_TEMPLATES':
                crumbs.push({ label: 'Modelos', active: true });
                break;
            default:
                break;
        }

        return crumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="h-[var(--navbar-height)] bg-bg-navbar border-b border-border-light flex items-center justify-between px-6 z-30 transition-all duration-300">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                >
                    <Menu size={22} />
                </button>

                <nav className="hidden md:flex items-center gap-2 text-[11px] font-medium text-slate-400">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                            {idx === 0 && <UserIcon size={12} className="mr-1" />}
                            <span className={crumb.active ? 'text-slate-600' : 'hover:text-slate-600 cursor-pointer'}>
                                {crumb.label}
                            </span>
                            {idx < breadcrumbs.length - 1 && <ChevronRight size={10} />}
                        </React.Fragment>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                    <button className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <Search size={18} />
                    </button>
                    <button className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 relative">
                        <Bell size={18} />
                        <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white"></div>
                    </button>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                <div className="flex items-center gap-3 pl-2">
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0].toUpperCase()}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                            {user?.email}
                        </span>
                        <span className="text-[9px] font-medium text-slate-300">
                            Sessão expira em: 0h 59m
                        </span>
                    </div>

                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                        <UserIcon size={20} />
                    </div>

                    <button
                        onClick={onLogout}
                        className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-premium hover:bg-primary-dark transition-all transform hover:scale-105 active:scale-95"
                        title="Encerrar Sessão"
                    >
                        <Lock size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
