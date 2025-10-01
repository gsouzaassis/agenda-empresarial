import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Appointment, Client, ServiceItem, Settings, Staff } from '../types';
import { uid, addHHmm, overlaps } from '../lib/date';

interface AppState {
  // dados
  clients: Client[];
  services: ServiceItem[];
  staff: Staff[];
  appointments: Appointment[];
  settings: Settings;
  // ações
  upsertClient: (c: Partial<Client> & { cpfNif: string; nome: string }) => Client;
  removeClient: (id: string) => void;
  upsertService: (s: Partial<ServiceItem> & { nome: string; duracaoMin: number; preco: number }) => ServiceItem;
  removeService: (id: string) => void;
  upsertStaff: (s: Partial<Staff> & { nome: string }) => Staff;
  removeStaff: (id: string) => void;
  bookAppointment: (p: Omit<Appointment, 'id' | 'createdAt' | 'status'> & { status?: Appointment['status'] }) => Appointment | string;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  rescheduleAppointment: (id: string, dateISO: string, start: string, end: string) => string | void;
  setSettings: (s: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  workDays: [1,2,3,4,5],
  workStart: '09:00',
  workEnd: '18:00',
  slotMinutes: 30,
  blockedWeekdays: [0], // domingo fechado por padrão
  blockedTimes: [],
  specialDates: [],
  legend: {
    open: 'var(--c-open)',
    confirmed: 'var(--c-confirmed)',
    canceled: 'var(--c-canceled)',
    special: 'var(--c-special)'
  }
};

export const useApp = create<AppState>()(persist((set, get) => ({
  clients: [],
  services: [
    { id: uid('svc'), nome: 'Consulta Padrão', duracaoMin: 60, preco: 60 },
    { id: uid('svc'), nome: 'Procedimento Curto', duracaoMin: 30, preco: 35 }
  ],
  staff: [{ id: uid('stf'), nome: 'Profissional Principal', funcao: 'Designer' }],
  appointments: [],
  settings: defaultSettings,

  upsertClient: (c) => {
    const state = get();
    const existing = c.id ? state.clients.find(x => x.id === c.id) : undefined;
    if (existing) {
      const updated = { ...existing, ...c } as Client;
      set({ clients: state.clients.map(x => x.id === updated.id ? updated : x) });
      return updated;
    }
    const created: Client = { id: uid('cli'), ...c } as Client;
    set({ clients: [...state.clients, created] });
    return created;
  },
  removeClient: (id) => set(state => ({ clients: state.clients.filter(c => c.id !== id) })),

  upsertService: (s) => {
    const state = get();
    const existing = s.id ? state.services.find(x => x.id === s.id) : undefined;
    if (existing) {
      const updated = { ...existing, ...s } as ServiceItem;
      set({ services: state.services.map(x => x.id === updated.id ? updated : x) });
      return updated;
    }
    const created: ServiceItem = { id: uid('svc'), ...s } as ServiceItem;
    set({ services: [...state.services, created] });
    return created;
  },
  removeService: (id) => set(state => ({ services: state.services.filter(s => s.id !== id) })),

  upsertStaff: (s) => {
    const state = get();
    const existing = s.id ? state.staff.find(x => x.id === s.id) : undefined;
    if (existing) {
      const updated = { ...existing, ...s } as Staff;
      set({ staff: state.staff.map(x => x.id === updated.id ? updated : x) });
      return updated;
    }
    const created: Staff = { id: uid('stf'), ...s } as Staff;
    set({ staff: [...state.staff, created] });
    return created;
  },
  removeStaff: (id) => set(state => ({ staff: state.staff.filter(s => s.id !== id) })),

  bookAppointment: (p) => {
    const state = get();
    // valida regras de disponibilidade e conflito
    const { settings, appointments, services } = state;
    const weekday = new Date(p.dateISO).getDay();
    if (settings.blockedWeekdays.includes(weekday)) return 'Dia bloqueado';

    const svc = services.find(s => s.id === p.serviceId);
    if (!svc) return 'Serviço inválido';

    const end = p.end ?? addHHmm(p.start, svc.duracaoMin);

    // bloqueios por horário
    if (settings.blockedTimes.includes(p.start)) return 'Horário bloqueado';

    // conflito com outros agendamentos (ignorando cancelados)
    const hasConflict = appointments.some(a => a.dateISO === p.dateISO && a.status !== 'canceled' && overlaps(a.start, a.end, p.start, end));
    if (hasConflict) return 'Conflito com outro agendamento';

    const created: Appointment = {
      id: uid('apt'),
      dateISO: p.dateISO,
      start: p.start,
      end,
      serviceId: p.serviceId,
      clientId: p.clientId,
      staffId: p.staffId,
      status: p.status ?? 'open',
      observacoes: p.observacoes,
      createdAt: new Date().toISOString()
    };
    set({ appointments: [...state.appointments, created] });
    return created;
  },

  updateAppointmentStatus: (id, status) => set(state => ({
    appointments: state.appointments.map(a => a.id === id ? { ...a, status } : a)
  })),

  rescheduleAppointment: (id, dateISO, start, end) => {
    const state = get();
    const apt = state.appointments.find(a => a.id === id);
    if (!apt) return 'Agendamento inexistente';
    const hasConflict = state.appointments.some(a => a.id !== id && a.dateISO === dateISO && a.status !== 'canceled' && overlaps(a.start, a.end, start, end));
    if (hasConflict) return 'Conflito com outro agendamento';
    set({ appointments: state.appointments.map(a => a.id === id ? { ...a, dateISO, start, end } : a) });
  },

  setSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } }))

}), { name: 'agenda-store' }));
