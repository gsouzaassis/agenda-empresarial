export type ID = string;

export type AppointmentStatus = 'open' | 'confirmed' | 'canceled';

export interface Client {
  id: ID;
  cpfNif: string;
  nome: string;
  idade?: number;
  telefone?: string;
  email?: string;
  observacoes?: string; // alergias, etc.
}

export interface ServiceItem {
  id: ID;
  nome: string;
  duracaoMin: number; // 30, 60, 90...
  preco: number; // em EUR
  equipeId?: ID; // profissional/equipe responsável (opcional)
}

export interface Staff {
  id: ID;
  nome: string;
  funcao?: string;
}

export interface SpecialDate {
  dateISO: string; // '2025-09-08'
  label: string;
  color: string; // hex
}

export interface Appointment {
  id: ID;
  dateISO: string; // dia do agendamento
  start: string;   // 'HH:mm'
  end: string;     // 'HH:mm'
  serviceId: ID;
  clientId?: ID;   // pode agendar e depois vincular cliente
  staffId?: ID;
  status: AppointmentStatus;
  observacoes?: string;
  createdAt: string;
}

export interface Settings {
  workDays: number[]; // 0..6 (domingo..sábado) permitidos
  workStart: string;  // '08:00'
  workEnd: string;    // '20:00'
  slotMinutes: number; // 30
  blockedWeekdays: number[]; // dias fechados
  blockedTimes: string[];    // horários bloqueados ('13:00', '13:30', ...)
  specialDates: SpecialDate[];
  legend: {
    open: string;
    confirmed: string;
    canceled: string;
    special: string;
  }
}
