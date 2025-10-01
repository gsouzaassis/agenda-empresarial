import { addMinutes, differenceInMinutes, format, isBefore, isEqual, parse, startOfDay } from 'date-fns';

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function hhmm(date: Date) {
  return format(date, 'HH:mm');
}

export function makeSlots(startHHmm: string, endHHmm: string, stepMin: number) {
  const base = startOfDay(new Date());
  const s = parse(startHHmm, 'HH:mm', base);
  const e = parse(endHHmm, 'HH:mm', base);
  let t = s;
  const slots: string[] = [];
  while (isBefore(t, e) || isEqual(t, e)) {
    slots.push(format(t, 'HH:mm'));
    t = addMinutes(t, stepMin);
  }
  // Remove o último se passa do fim exato
  if (slots.length && slots[slots.length - 1] === format(e, 'HH:mm')) slots.pop();
  return slots;
}

export function addHHmm(hhmmStr: string, minutes: number) {
  const base = startOfDay(new Date());
  const t = parse(hhmmStr, 'HH:mm', base);
  return hhmm(addMinutes(t, minutes));
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const base = startOfDay(new Date());
  const as = parse(aStart, 'HH:mm', base).getTime();
  const ae = parse(aEnd, 'HH:mm', base).getTime();
  const bs = parse(bStart, 'HH:mm', base).getTime();
  const be = parse(bEnd, 'HH:mm', base).getTime();
  return as < be && bs < ae;
}

export function durationToSlots(durationMin: number, stepMin: number) {
  return Math.ceil(durationMin / stepMin);
}
