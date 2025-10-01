// src/pages/Agenda.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import DaySlotsPanel from "../components/agenda/DaySlotsPanel";
import { NewAppointmentModal } from "../components/modals/NewAppointmentModal";
import { RescheduleModal } from "../components/modals/RescheduleModal";
import { SettingsModal } from "../components/modals/SettingsModal";
import { useApp } from "../state/store";
import { format } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

function isPast(dateISO: string, hhmmEnd: string) {
  const end = new Date(`${dateISO}T${hhmmEnd}:00`);
  return new Date().getTime() > end.getTime();
}
function statusLabel(s: "open" | "confirmed" | "canceled" | "done") {
  switch (s) {
    case "open":
      return "Aberto";
    case "confirmed":
      return "Confirmado";
    case "canceled":
      return "Cancelado";
    case "done":
      return "Concluído";
    default:
      return s;
  }
}

export default function AgendaPage() {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());
  const [slotToBook, setSlotToBook] = useState<{ dateISO: string; start: string } | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { appointments, services, clients } = useApp();
  const calRef = useRef<HTMLDivElement>(null);

  // ✅ Garante que o botão "Ajustes" apareça no TopNav quando abrir a Agenda
  useEffect(() => {
    // @ts-ignore
    window.dispatchEvent(new CustomEvent("toggle-settings", { detail: { visible: true } }));
    return () => {
      // @ts-ignore
      window.dispatchEvent(new CustomEvent("toggle-settings", { detail: { visible: false } }));
    };
  }, []);

  // Abre o modal de Ajustes quando o TopNav dispara "open-settings"
  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    // @ts-ignore
    window.addEventListener("open-settings", handler as EventListener);
    return () => {
      // @ts-ignore
      window.removeEventListener("open-settings", handler as EventListener);
    };
  }, []);

  const onSelectDay = (d: Date) => {
    setSelected(d);
    setTimeout(() => calRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  };

  const selectedISO = selected ? selected.toISOString().slice(0, 10) : "";
  const list = useMemo(
    () =>
      appointments
        .filter((a) => a.dateISO === selectedISO)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [appointments, selectedISO]
  );

  function setStatus(id: string, status: "open" | "confirmed" | "canceled" | "done") {
    const st: any = useApp.getState();
    if (typeof st.updateAppointment === "function") {
      st.updateAppointment(id, { status });
    } else if (typeof (useApp as any).setState === "function") {
      (useApp as any).setState((s: any) => ({
        appointments: s.appointments.map((x: any) => (x.id === id ? { ...x, status } : x)),
      }));
    }
  }

  return (
    <div className="container-page">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2" ref={calRef}>
          <MonthCalendar
            current={current}
            setCurrent={setCurrent}
            selected={selected}
            onSelect={onSelectDay}
            onToday={() => {
              const now = new Date();
              setCurrent(now);
              setSelected(now);
              setTimeout(() => calRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
            }}
          />

          {selected && (
            <DaySlotsPanel
              date={selected}
              onPick={(start) =>
                setSlotToBook({ dateISO: selected.toISOString().slice(0, 10), start })
              }
              onClose={() => setSelected(null)}
            />
          )}
        </div>

        {/* Agenda do dia */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header font-semibold">
              {selected
                ? `Agenda de ${format(selected, "dd 'de' MMMM, yyyy", { locale: ptBR })}`
                : "Agenda do dia"}
            </div>
            <div className="card-body space-y-2">
              {!selected && (
                <div className="text-slate-500 text-sm">
                  Selecione um dia para ver os agendamentos.
                </div>
              )}
              {selected && list.length === 0 && (
                <div className="text-slate-500 text-sm">Sem agendamentos.</div>
              )}

              {selected &&
                list.map((a) => {
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
                    <div key={a.id} className="border rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {a.start} - {a.end} · {svc?.nome ?? "Serviço"}
                          </div>
                          {client?.nome && (
                            <div className="text-xs text-slate-600 truncate">{client.nome}</div>
                          )}
                          <div className={`badge ${badge} mt-1`}>{statusLabel(a.status)}</div>
                        </div>

                        {/* Ações */}
                        <div className="flex flex-wrap gap-1 justify-end">
                          {!past && a.status === "open" && (
                            <>
                              <button className="btn btn-ghost btn-xs" onClick={() => setStatus(a.id, "confirmed")}>
                                Confirmar
                              </button>
                              <button className="btn btn-ghost btn-xs" onClick={() => setStatus(a.id, "canceled")}>
                                Cancelar
                              </button>
                              <button className="btn btn-ghost btn-xs" onClick={() => setRescheduleFor(a.id)}>
                                Reagendar
                              </button>
                            </>
                          )}
                          {!past && a.status === "confirmed" && (
                            <button className="btn btn-ghost btn-xs" onClick={() => setStatus(a.id, "canceled")}>
                              Cancelar
                            </button>
                          )}
                          {past && a.status !== "done" && a.status !== "canceled" && (
                            <>
                              <button className="btn btn-primary btn-xs" onClick={() => setStatus(a.id, "done")}>
                                Concluído
                              </button>
                              <button className="btn btn-ghost btn-xs" onClick={() => setStatus(a.id, "canceled")}>
                                Cancelar
                              </button>
                            </>
                          )}
                          {a.status === "canceled" && (
                            <button className="btn btn-ghost btn-xs" onClick={() => setRescheduleFor(a.id)}>
                              Reagendar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {slotToBook && (
        <NewAppointmentModal
          dateISO={slotToBook.dateISO}
          start={slotToBook.start}
          onClose={() => setSlotToBook(null)}
        />
      )}

      {rescheduleFor && (
        <RescheduleModal
          appointmentId={rescheduleFor}
          onClose={() => setRescheduleFor(null)}
          onDone={() => setRescheduleFor(null)}
        />
      )}

      {settingsOpen && <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
