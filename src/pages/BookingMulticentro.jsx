import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getScope, getNombreCentro } from "../utils/scope";
import AgendaSummarySelector from "../components/agenda/AgendaSummarySelector";
import AgendaDayController from "../components/agenda/AgendaDayController";
import PatientForm from "../components/patient/PatientForm";

const API_URL = import.meta.env.VITE_API_URL;

export default function BookingMulticentro() {
  const { session, login } = useAuth();

  const scope       = useMemo(() => getScope(), []);
  const nombreCentro = useMemo(() => getNombreCentro(), []);

  const [professionals,   setProfessionals]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [loadError,       setLoadError]       = useState("");
  const [selectedDay,     setSelectedDay]     = useState(null);
  const [patientOpen,     setPatientOpen]     = useState(false);
  const [pendingSlot,     setPendingSlot]     = useState(null);
  const [agendaReloadKey, setAgendaReloadKey] = useState(0);
  const [reserving,       setReserving]       = useState(false);
  const [reserveError,    setReserveError]    = useState("");

  useEffect(() => {
    if (!session) {
      login({
        usuario: "public_web",
        role: { name: "public", entry: "/reservas", allow: ["agenda_public"] },
        professional: "system",
      });
    }
  }, [session, login]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfessionals() {
      setLoading(true); setLoadError("");
      try {
        const params = new URLSearchParams({ public: "true", scope });
        const res    = await fetch(`${API_URL}/professionals?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setProfessionals(list.map(p => ({
            id:        p.id,
            name:      p.name,
            role:      p.role,
            specialty: p.specialty,
          })));
        }
      } catch {
        if (!cancelled) { setProfessionals([]); setLoadError("No se pudo cargar la lista de profesionales."); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfessionals();
    return () => { cancelled = true; };
  }, [scope]);

  function handleAttend(slot) {
    if (reserving || !slot || slot.status !== "available") return;
    setReserveError("");
    setPendingSlot(slot);
    setPatientOpen(true);
  }

  async function reserveSlot(rut) {
    if (!pendingSlot) return;
    if (!rut) { setReserveError("RUT inválido."); return; }
    const { date, time, professional } = pendingSlot;
    setReserving(true); setReserveError("");
    try {
      const res = await fetch(`${API_URL}/agenda/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, professional, rut }),
      });
      if (!res.ok) {
        let msg = "No se pudo reservar.";
        try { const j = await res.json(); msg = j?.detail || j?.error || j?.message || msg; } catch {}
        throw new Error(msg);
      }
      setAgendaReloadKey(k => k + 1);
      setPatientOpen(false);
      setPendingSlot(null);
    } catch (e) {
      setReserveError(e?.message || "Error reservando la hora.");
    } finally {
      setReserving(false);
    }
  }

  function handleBack() {
    setReserveError(""); setPendingSlot(null);
    setPatientOpen(false); setSelectedDay(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{
        background: "#0f172a", color: "#fff",
        padding: "16px 20px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{nombreCentro}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Reserva tu hora en línea</div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {selectedDay ? "Selecciona un horario" : "Selecciona día y profesional"}
            </div>
          </div>
          {selectedDay && (
            <button onClick={handleBack} style={{
              border: "1px solid #e2e8f0", background: "#fff",
              borderRadius: 10, padding: "8px 12px",
              cursor: "pointer", fontWeight: 700, color: "#0f172a", fontSize: 13,
            }}>
              ← Volver
            </button>
          )}
        </div>

        {loadError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
            padding: 12, borderRadius: 12, marginBottom: 12, fontWeight: 700 }}>
            {loadError}
          </div>
        )}
        {reserveError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
            padding: 12, borderRadius: 12, marginBottom: 12, fontWeight: 700 }}>
            {reserveError}
          </div>
        )}

        {!selectedDay ? (
          loading ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Cargando…</div>
          ) : professionals.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Sin profesionales disponibles.</div>
          ) : (
            <AgendaSummarySelector
              professionals={professionals}
              onSelectDay={setSelectedDay}
            />
          )
        ) : (
          <>
            <AgendaDayController
              key={agendaReloadKey}
              professional={selectedDay.professional}
              date={selectedDay.date}
              role="PUBLIC"
              onAttend={handleAttend}
            />
            <PatientForm
              open={patientOpen}
              loading={reserving}
              onConfirm={(patient) => reserveSlot(patient.rut)}
              onCreate={(patient)  => reserveSlot(patient.rut)}
              onCancel={() => {
                if (reserving) return;
                setPendingSlot(null); setPatientOpen(false); setReserveError("");
              }}
            />
          </>
        )}
      </div>
    </div>
  );
      }
