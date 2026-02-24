
import React, { useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    MapPin,
    User,
    X,
    Trash2,
    CheckCircle2,
    CalendarDays
} from 'lucide-react';
import { Appointment, Client, Project } from '../types';

// HELPERS NATIVOS PARA SUBSTITUIR DATE-FNS
const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
};
const endOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() + (6 - day);
    return new Date(d.setDate(diff));
};
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const isSameMonth = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
const isToday = (date: Date) => isSameDay(date, new Date());
const formatISO = (date: Date) => date.toISOString();
const parseISO = (iso: string) => new Date(iso);

const formatLocal = (date: Date, options: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
};

const formatDateForInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

interface CalendarViewProps {
    appointments: Appointment[];
    clients: Client[];
    projects: Project[];
    onSaveAppointment: (appointment: any, id?: string) => void;
    onDeleteAppointment: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
    appointments,
    clients,
    projects,
    onSaveAppointment,
    onDeleteAppointment
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        client_id: '',
        project_id: '',
        start_time: '',
        end_time: '',
        type: 'visit' as any,
        status: 'scheduled' as any,
        location: ''
    });

    const calendarDays = useMemo(() => {
        const monthStartDay = startOfMonth(currentMonth);
        const monthEndDay = endOfMonth(monthStartDay);
        const startDate = startOfWeek(monthStartDay);
        const endDate = endOfWeek(monthEndDay);

        const days = [];
        let day = new Date(startDate);
        while (day <= endDate) {
            days.push(new Date(day));
            day.setDate(day.getDate() + 1);
        }
        return days;
    }, [currentMonth]);

    const appointmentsByDay = useMemo(() => {
        const acc: Record<string, Appointment[]> = {};
        appointments.forEach(app => {
            const d = parseISO(app.start_time);
            const day = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            if (!acc[day]) acc[day] = [];
            acc[day].push(app);
        });
        return acc;
    }, [appointments]);

    const selectedDayAppointments = useMemo(() => {
        const day = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
        return appointmentsByDay[day] || [];
    }, [selectedDate, appointmentsByDay]);

    const handlePrevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleOpenModal = (app?: Appointment) => {
        if (app) {
            setEditingAppointment(app);
            setFormData({
                title: app.title,
                description: app.description || '',
                client_id: app.client_id || '',
                project_id: app.project_id || '',
                start_time: formatDateForInput(parseISO(app.start_time)),
                end_time: formatDateForInput(parseISO(app.end_time)),
                type: app.type,
                status: app.status,
                location: app.location || ''
            });
        } else {
            setEditingAppointment(null);
            const start = new Date(selectedDate);
            start.setHours(9, 0, 0, 0);
            const end = new Date(selectedDate);
            end.setHours(10, 0, 0, 0);

            setFormData({
                title: '',
                description: '',
                client_id: '',
                project_id: '',
                start_time: formatDateForInput(start),
                end_time: formatDateForInput(end),
                type: 'visit',
                status: 'scheduled',
                location: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveAppointment({
            ...formData,
            start_time: new Date(formData.start_time).toISOString(),
            end_time: new Date(formData.end_time).toISOString()
        }, editingAppointment?.id);
        setShowModal(false);
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'visit': return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10';
            case 'delivery': return 'bg-primary/5 text-primary-dark border-primary/20 ring-primary/10';
            case 'meeting': return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10';
            case 'office': return 'bg-violet-50 text-violet-700 border-violet-200 ring-violet-500/10';
            default: return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10';
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-primary/10 text-primary-dark border-primary/20 font-black';
            case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={10} />;
            case 'cancelled': return <X size={10} />;
            case 'confirmed': return <Clock size={10} />;
            default: return <Clock size={10} />;
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 shrink-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 text-white shrink-0">
                            <CalendarDays size={20} sm:size={24} />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="leading-none truncate">Agenda de Serviços</span>
                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5 truncate">MétricaAgro Operation Control</span>
                        </div>
                    </h2>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="group relative flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-slate-900 text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-primary transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 active:scale-95 overflow-hidden w-full sm:w-auto"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Plus size={18} className="relative z-10" />
                    <span className="relative z-10">Novo Agendamento</span>
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                {/* CALENDÁRIO */}
                <div className="lg:w-3/4 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 flex flex-col overflow-hidden h-full">
                    <div className="p-4 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 shrink-0 bg-slate-50/30 gap-4">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800 capitalize flex items-center gap-3">
                            {formatLocal(currentMonth, { month: 'long' })}
                            <span className="text-primary/40 text-2xl font-light">/</span>
                            <span className="text-slate-400">{currentMonth.getFullYear()}</span>
                        </h3>
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-primary-dark">
                                    <ChevronLeft size={18} />
                                </button>
                                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 hover:bg-slate-50 rounded-xl text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                    Hoje
                                </button>
                                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-primary-dark">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 bg-white border-b border-slate-100 shrink-0">
                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                            <div key={day} className="py-3 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                {day.slice(0, 3)}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 grid grid-cols-7 overflow-y-auto custom-scrollbar">
                        {calendarDays.map((day, idx) => {
                            const dayKey = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;
                            const dayAppointments = appointmentsByDay[dayKey] || [];
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonthDay = isSameMonth(day, currentMonth);
                            const isTodayDay = isToday(day);

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`relative min-h-[80px] sm:min-h-[100px] p-2 sm:p-3 border-r border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 group ${!isCurrentMonthDay ? 'bg-slate-50/30' : ''} ${isSelected ? 'bg-primary/5 border border-primary/20' : ''}`}
                                >
                                    {isSelected && <div className="absolute inset-x-0 top-0 h-1 bg-primary-light animate-in slide-in-from-top-full" />}

                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isTodayDay ? 'bg-primary text-white shadow-lg shadow-primary/10 scale-110' : isSelected ? 'bg-primary/10 text-primary-dark font-black' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                            {day.getDate()}
                                        </span>
                                        {dayAppointments.length > 0 && (
                                            <div className="flex -space-x-1">
                                                {dayAppointments.slice(0, 3).map((app, i) => (
                                                    <div key={app.id} className={`w-1.5 h-1.5 rounded-full border border-white ${app.type === 'visit' ? 'bg-blue-500' : app.type === 'delivery' ? 'bg-primary-light' : app.type === 'meeting' ? 'bg-amber-500' : 'bg-violet-500'}`} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {dayAppointments.slice(0, 2).map(app => (
                                            <div key={app.id} className={`text-[9px] font-bold p-1.5 rounded-lg border shadow-sm truncate flex items-center gap-1.5 ${getTypeStyle(app.type)}`}>
                                                <div className={`w-1 h-1 rounded-full shrink-0 ${app.type === 'visit' ? 'bg-blue-600' : app.type === 'delivery' ? 'bg-primary' : app.type === 'meeting' ? 'bg-amber-600' : 'bg-violet-600'}`} />
                                                {app.title}
                                            </div>
                                        ))}
                                        {dayAppointments.length > 2 && (
                                            <div className="text-[9px] text-slate-400 font-bold px-1.5 pt-0.5">
                                                + {dayAppointments.length - 2} atividades
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* LISTA DE COMPROMISSOS DO DIA */}
                <div className="lg:w-1/4 flex flex-col gap-6 h-full overflow-hidden">
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-8 flex-1 flex flex-col overflow-hidden relative">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 shrink-0 gap-4">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center flex-wrap">
                                    {formatLocal(selectedDate, { day: '2-digit' })}
                                    <span className="text-slate-300 font-light mx-2">de</span>
                                    <span className="text-primary uppercase tracking-tighter">{formatLocal(selectedDate, { month: 'long' })}</span>
                                </h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                                    Linha do Tempo
                                </p>
                            </div>
                            {isToday(selectedDate) && (
                                <div className="px-3 py-1 bg-primary/5 text-primary rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/20 animate-pulse">
                                    Hoje
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                            {selectedDayAppointments.length > 0 ? (
                                [...selectedDayAppointments].sort((a, b) => a.start_time.localeCompare(b.start_time)).map(app => (
                                    <div key={app.id} className="group relative pl-6 transition-all">
                                        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100 group-last:bg-transparent" />
                                        <div className={`absolute left-[-4px] top-6 w-2 h-2 rounded-full border-2 border-white ring-4 ring-white ${app.type === 'visit' ? 'bg-blue-500' : app.type === 'delivery' ? 'bg-primary-light' : app.type === 'meeting' ? 'bg-amber-500' : 'bg-violet-500'}`} />

                                        <div className="p-5 bg-slate-50/50 rounded-2xl border border-transparent hover:border-primary/40 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-[0.1em] border ${getTypeStyle(app.type)}`}>
                                                    {app.type === 'visit' ? 'Visita Técnica' : app.type === 'delivery' ? 'Entrega' : app.type === 'meeting' ? 'Reunião' : app.type === 'office' ? 'Escritório' : 'Outro'}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => handleOpenModal(app)} className="p-2 bg-white text-slate-400 hover:text-primary rounded-xl shadow-sm transition-colors">
                                                        <Plus size={14} className="rotate-45" />
                                                    </button>
                                                    <button onClick={() => onDeleteAppointment(app.id)} className="p-2 bg-white text-slate-400 hover:text-rose-600 rounded-xl shadow-sm transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2">
                                                <Clock size={12} className="text-primary-light" />
                                                <span>{formatLocal(parseISO(app.start_time), { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-slate-300">•</span>
                                                <span>{formatLocal(parseISO(app.end_time), { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            <h4 className="text-sm font-bold text-slate-800 mb-2 leading-tight">{app.title}</h4>

                                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                                                {app.location && (
                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                        <MapPin size={12} className="text-rose-400" />
                                                        <span className="truncate">{app.location}</span>
                                                    </div>
                                                )}
                                                {app.client_id && (
                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                        <User size={12} className="text-blue-400" />
                                                        <span className="truncate">{clients.find(c => c.id === app.client_id)?.name}</span>
                                                    </div>
                                                )}
                                                <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border ${getStatusStyles(app.status)}`}>
                                                    {getStatusIcon(app.status)}
                                                    {app.status}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                        <Clock size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Nenhuma Atividade Ativa</p>
                                    <p className="text-xs text-slate-400 mt-2 max-w-[150px]">Aproveite para planejar o seu próximo passo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE AGENDAMENTO */}
            {
                showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">
                            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center">
                                        <CalendarDays size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{formatLocal(selectedDate, { day: '2-digit', month: 'long' })}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                                <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Título do Compromisso</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                placeholder="Ex: Visita Técnica Fazenda Sol"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Início</label>
                                            <input
                                                required
                                                type="datetime-local"
                                                value={formData.start_time}
                                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Término</label>
                                            <input
                                                required
                                                type="datetime-local"
                                                value={formData.end_time}
                                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 col-span-2">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                                                <select
                                                    value={formData.type}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                >
                                                    <option value="visit">Visita Técnica</option>
                                                    <option value="delivery">Entrega de Documentos</option>
                                                    <option value="meeting">Reunião com Cliente</option>
                                                    <option value="office">Trabalho Interno</option>
                                                    <option value="other">Outros</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                                <select
                                                    value={formData.status}
                                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                >
                                                    <option value="scheduled">Agendado</option>
                                                    <option value="confirmed">Confirmado</option>
                                                    <option value="cancelled">Cancelado</option>
                                                    <option value="completed">Concluído</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Localização</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={formData.location}
                                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                    placeholder="Endereço ou Local"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente Vinculado</label>
                                            <select
                                                value={formData.client_id}
                                                onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            >
                                                <option value="">Sem Cliente</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Projeto Vinculado</label>
                                            <select
                                                value={formData.project_id}
                                                onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            >
                                                <option value="">Sem Projeto</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                            </select>
                                        </div>

                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[80px]"
                                                placeholder="Detalhes do compromisso..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-4 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-6 py-3 bg-white text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-2 px-10 py-3 bg-primary text-white font-black uppercase tracking-widest hover:bg-primary-dark shadow-xl shadow-primary/10"
                                    >
                                        {editingAppointment ? 'Salvar' : 'Agendar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CalendarView;
