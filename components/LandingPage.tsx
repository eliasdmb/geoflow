import React from 'react';
import {
    ArrowRight,
    Map,
    ShieldCheck,
    BarChart3,
    Satellite,
    Navigation,
    CheckCircle2,
    ChevronRight,
    Menu,
    X
} from 'lucide-react';

interface LandingPageProps {
    onEnterApp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    return (
        <div className="min-h-screen bg-bg-main selection:bg-primary selection:text-white font-sans text-slate- main">
            {/* Navigation */}
            <nav className="fixed top-0 inset-x-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-border-light">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white shadow-premium animate-float">
                                <Map size={22} />
                            </div>
                            <span className="font-heading font-bold text-xl text-slate-main tracking-tighter">
                                Metrica<span className="text-primary italic">Agro</span>
                            </span>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#solucoes" className="text-sm font-semibold text-slate-muted hover:text-primary transition-colors">Soluções</a>
                            <a href="#sobre" className="text-sm font-semibold text-slate-muted hover:text-primary transition-colors">Sobre</a>
                            <button
                                onClick={onEnterApp}
                                className="px-6 py-2.5 bg-slate-main text-white text-sm font-bold rounded-xl shadow-premium hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                            >
                                Entrar no Sistema
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 text-slate-main hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-b border-border-light animate-in slide-in-from-top-4 duration-300">
                        <div className="px-4 pt-2 pb-6 space-y-4">
                            <a href="#solucoes" className="block px-4 py-2 text-base font-semibold text-slate-muted border-l-2 border-transparent">Soluções</a>
                            <a href="#sobre" className="block px-4 py-2 text-base font-semibold text-slate-muted border-l-2 border-transparent">Sobre</a>
                            <button
                                onClick={onEnterApp}
                                className="w-full px-4 py-3 bg-primary text-white text-base font-bold rounded-xl shadow-premium flex items-center justify-center gap-2"
                            >
                                Entrar no Sistema
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop"
                        alt="Background Field"
                        className="w-full h-full object-cover opacity-5"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-bg-main via-bg-main/90 to-bg-main"></div>
                </div>

                {/* Abstract Background Orbs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -z-10" style={{ animationDelay: '2s' }}></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary-dark">Inovação no Campo</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl font-heading font-black text-slate-main leading-[1.1] tracking-tighter">
                                Gestão Inteligente de Projetos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">Georreferenciamento de Imóveis Rurais.</span>
                            </h1>

                            <ul className="space-y-3">
                                {[
                                    'Fluxo completo do início à certificação.',
                                    'Organização por cliente, propriedade e serventia.',
                                    'Geração automatizada de documentos técnicos.',
                                    'Acompanhamento de status por etapa.',
                                    'Redução de retrabalho técnico.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-muted font-bold text-lg">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    onClick={onEnterApp}
                                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-premium hover:bg-primary-dark transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group"
                                >
                                    ACESSAR PLATAFORMA
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <div className="flex items-center gap-4 px-6 py-4 bg-white/50 backdrop-blur-sm border border-border-light rounded-2xl">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {i}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs font-bold text-slate-main leading-none uppercase tracking-tighter">
                                        +500 Projetos <br /> <span className="text-slate-muted font-normal lowercase tracking-normal">certificados este ano</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative mt-10 lg:mt-0 animate-in fade-in zoom-in duration-1000 delay-300">
                            <div className="relative z-10 glass-card p-4 rounded-[2rem] shadow-2xl overflow-hidden ring-1 ring-white/20">
                                <img
                                    src="https://lh3.googleusercontent.com/d/1-GgbgfirkC0uitQpun5jmfIeNuc8P6IO"
                                    alt="Metrica Agro"
                                    className="rounded-3xl shadow-inner w-full h-[300px] sm:h-[500px] object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                                {/* Floating UI Element */}
                                <div className="absolute bottom-10 left-10 glass-effect p-6 rounded-2xl shadow-premium border border-white/30 animate-float">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                                            <BarChart3 size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Precisão de Dados</p>
                                            <p className="text-xl font-black text-white">99.98%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary opacity-20 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary opacity-10 rounded-full blur-[80px]"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solutions Section */}
            <section id="solucoes" className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Nossas Soluções</h2>
                        <h3 className="text-3xl sm:text-5xl font-heading font-black text-slate-main tracking-tighter">
                            Ferramentas Inteligentes para <br /> Resultados Extraordinários.
                        </h3>
                        <p className="text-slate-muted font-medium text-lg">
                            De georreferenciamento ao CAR, oferecemos tudo o que você precisa para regularizar e gerenciar propriedades rurais com eficiência.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Satellite size={32} />}
                            title="Georreferenciamento"
                            description="Levantamentos perimétricos de alta precisão com tecnologia GNSS e certificação garantida no SIGEF/INCRA."
                            color="primary"
                        />
                        <FeatureCard
                            icon={<Navigation size={32} />}
                            title="CAD Ambiental Rural"
                            description="Elaboração e retificação de CAR com análise técnica criteriosa para segurança jurídica completa."
                            color="blue"
                        />
                        <FeatureCard
                            icon={<ShieldCheck size={32} />}
                            title="Gestão de Projetos"
                            description="Controle total sobre cronogramas, documentação e fluxos financeiros em um ambiente centralizado."
                            color="slate"
                        />
                    </div>
                </div>
            </section>

            {/* Stats / Proof Section */}
            <section id="sobre" className="py-24 bg-slate-main relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-4 gap-12 text-center">
                        <StatItem value="10k+" label="Hectares Mapeados" />
                        <StatItem value="500+" label="Clientes Atendidos" />
                        <StatItem value="15+" label="Anos de Experiência" />
                        <StatItem value="100%" label="Satisfação Técnica" />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-border-light py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-soft">
                                <Map size={18} />
                            </div>
                            <span className="font-heading font-bold text-lg text-slate-main tracking-tighter">
                                Metrica<span className="text-primary italic">Agro</span>
                            </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-muted uppercase tracking-widest">
                            © 2026 MetricaAgro. Todos os direitos reservados.
                        </p>

                        <div className="flex gap-6">
                            <a href="#" className="text-slate-muted hover:text-primary transition-colors font-bold text-[10px] uppercase tracking-widest">Privacidade</a>
                            <a href="#" className="text-slate-muted hover:text-primary transition-colors font-bold text-[10px] uppercase tracking-widest">Termos</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, color: string }> = ({ icon, title, description, color }) => (
    <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 transition-all duration-500 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 hover:translate-y-[-8px] group relative overflow-hidden">
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity bg-${color === 'primary' ? 'primary' : color === 'blue' ? 'secondary' : 'slate'}-500`}></div>
        <div className="w-16 h-16 bg-white rounded-2xl shadow-soft flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 mb-8 transform group-hover:rotate-6">
            {icon}
        </div>
        <h4 className="text-xl font-heading font-black text-slate-main mb-4 tracking-tighter uppercase">{title}</h4>
        <p className="text-slate-muted font-medium leading-relaxed mb-8">{description}</p>
        <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] group-hover:gap-4 transition-all">
            Saiba Mais <ChevronRight size={14} />
        </div>
    </div>
);

const StatItem: React.FC<{ value: string, label: string }> = ({ value, label }) => (
    <div className="space-y-2">
        <div className="text-4xl sm:text-5xl font-heading font-black text-white tracking-tighter">{value}</div>
        <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{label}</div>
    </div>
);

export default LandingPage;
