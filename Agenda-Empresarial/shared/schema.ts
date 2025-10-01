// This file contains the shared schema definitions for the appointment system
// Since this is a client-side only app with localStorage, we'll keep this minimal

export type ID = string;

export type AppointmentStatus = 'open' | 'confirmed' | 'canceled';

export interface Client {
  id: ID;
  cpfNif: string;
  nome: string;
  idade?: number;
  telefone?: string;
  email?: string;
  observacoes?: string;
}

export interface ServiceItem {
  id: ID;
  nome: string;
  duracaoMin: number;
  preco: number;
  equipeId?: ID;
}

export interface Staff {
  id: ID;
  nome: string;
  funcao?: string;
}

export interface SpecialDate {
  dateISO: string;
  label: string;
  color: string;
}

export interface Appointment {
  id: ID;
  dateISO: string;
  start: string;
  end: string;
  serviceId: ID;
  clientId?: ID;
  staffId?: ID;
  status: AppointmentStatus;
  observacoes?: string;
  createdAt: string;
}

export interface Settings {
  workDays: number[];
  workStart: string;
  workEnd: string;
  slotMinutes: number;
  blockedWeekdays: number[];
  blockedTimes: string[];
  specialDates: SpecialDate[];
  legend: {
    open: string;
    confirmed: string;
    canceled: string;
    special: string;
  }
}
