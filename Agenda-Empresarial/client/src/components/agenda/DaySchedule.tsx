import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { useApp } from "../../state/store";
import { makeSlots } from "../../lib/date";
import { NewAppointmentModal } from "../modals/NewAppointmentModal";
import { RescheduleModal } from "../modals/RescheduleModal";

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isPast(dateISO: string, hhmmEnd: string) {
  const end = new Date(`${dateISO}T${hhmmEnd}:00`);
  return new Date().getTime() > end.getTime();
}
function statusLabel(s: "open" | "confirmed" | "canceled" | "done") {
  switch (s) {
    case "open": return "Aberto";
    case "confirmed": return "Confirmado";
    case "canceled": return "Cancelado";
    case "done": return "Concluído";
    default: return s;
  }
}

export function DaySchedule({ date }: { date: Date | null }) {
  // 👇 inclui clients
  const { settings, appointments, services, clients } = useApp();
  const [openNew, setOpenNew] = useState<{ start: string } | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null);

  const dateISO = date ? toLocalISO(date) : "";

  const slots = useMemo(() => {
    if (!date) return [] as string[];
    return makeSlots(settings.workStart, settings.workEnd, settings.slotMinutes);
  }, [date, settings.workStart, settings.workEnd, settings.slotMinutes]);

  const list = useMemo(
    () =>
      appointments
        .filter((a) => a.dateISO === dateISO)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [appointments, dateISO]
  );

  function setStatus(id: string, status: "open" | "confirmed" | "canceled" | "done") {
    const st: any = useApp.getState();
    if (typeof st.updateAppointment === "function") {
      st.updateAppointment(id, { status });
    } else if (typeof (useApp as any).setState === "function") {
      (useApp as any).setState((s: any) => ({
        appointments: s.appointments.map((x: any) =>
          x.id === id ? { ...x, status } : x
        ),
      }));
    }
  }

  if (!date) {
    return (
      <div className="card">
        <div className="card-body text-slate-500 text-sm">
          Selecione um dia no calendário para ver os horários.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Grade de horários */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <div className="font-semibold text-sm md:text-base">
              Horários de {format(date, "dd/MM/yyyy")}
            </div>
          </div>

          <div className="card-body grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {slots.map((s) => {
              const blocked = (settings.blockedTimes ?? []).includes(s);
              const hasApt = list.find(
                (a) => s >= a.start && s < a.end && a.status !== "canceled"
              );

              const label = blocked ? "Bloqueado" : hasApt ? "Ocupado" : s;
              const stateClass = blocked
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : hasApt
                ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                : "bg-white hover:bg-brand-50";

              return (
                <button
                  key={s}
                  className={`time-slot rounded-xl px-3 py-4 text-sm text-center ${stateClass}`}
                  disabled={blocked || !!hasApt}
                  onClick={() => setOpenNew({ start: s })}
                  aria-label={`Horário ${s} ${
                    blocked ? "bloqueado" : hasApt ? "ocupado" : "disponível"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda do dia */}
        <div className="card">
          <div className="card-header font-semibold text-sm md:text-base">
            Agenda do dia
          </div>
          <div className="card-body space-y-2">
            {list.length === 0 && (
              <div className="text-slate-500 text-sm">Sem agendamentos.</div>
            )}

            {list.map((a) => {
              const svc = services.find((s) => s.id === a.serviceId);
              const client = clients.find((c) => c.id === (a as any).clientId);
              const badge =
                a.status === "open"
                  ? "badge-appointments"
                  : a.status === "confirmed"
                  ? "badge-confirmed"
                  : a.status === "canceled"
                  ? "badge-canceled"
                  : "badge-done";
              const past = isPast(a.dateISO, a.end);

              return (
                <div
                  key={a.id}
                  className="border rounded-xl p-3 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {a.start} - {a.end} · {svc?.nome ?? "Serviço"}
                    </div>
                    {/* 👇 nova linha, pequena e discreta, com o nome da cliente */}
                    {client?.nome && (
                      <div className="text-xs text-slate-600 truncate">
                        {client.nome}
                      </div>
                    )}
                    <div className={`badge ${badge} mt-1`}>
                      {statusLabel(a.status)}
                    </div>
                  </div>

                  {/* Ações compactas */}
                  <div className="flex flex-wrap gap-1 justify-end">
                    {!past && a.status === "open" && (
                      <>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setStatus(a.id, "confirmed")}
                        >
                          Confirmar
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setStatus(a.id, "canceled")}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setRescheduleFor(a.id)}
                        >
                          Reagendar
                        </button>
                      </>
                    )}

                    {!past && a.status === "confirmed" && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setStatus(a.id, "canceled")}
                      >
                        Cancelar
                      </button>
                    )}

                    {!past && a.status === "canceled" && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setRescheduleFor(a.id)}
                      >
                        Reagendar
                      </button>
                    )}

                    {past && a.status !== "done" && a.status !== "canceled" && (
                      <>
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => setStatus(a.id, "done")}
                        >
                          Concluído
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setStatus(a.id, "canceled")}
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {a.status === "canceled" && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setRescheduleFor(a.id)}
                      >
                        Reagendar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modais */}
      {openNew && (
        <NewAppointmentModal
          dateISO={dateISO}
          start={openNew.start}
          onClose={() => setOpenNew(null)}
        />
      )}

      {rescheduleFor && (
        <RescheduleModal
          appointmentId={rescheduleFor}
          onClose={() => setRescheduleFor(null)}
          onDone={() => setRescheduleFor(null)}
        />
      )}
    </>
  );
}

export default DaySchedule;
