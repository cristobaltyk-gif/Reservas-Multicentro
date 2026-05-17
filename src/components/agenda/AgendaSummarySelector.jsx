import { useEffect, useMemo, useState } from "react";
import "../../styles/agenda/agenda-summary-selector.css";

const API_URL = import.meta.env.VITE_API_URL;

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ── Grupos — clasificación por specialty ─────────────────────
const GRUPOS = [
  {
    label:      "Traumatología · Cirugía Articular",
    icon:       "🦴",
    specialties: ["cadera", "rodilla", "hombro", "columna", "tobillo", "traumatología", "traumatologia", "cirugía articular", "cirugia articular"],
    color:      "#0f172a",
    bg:         "#f8fafc",
    border:     "#cbd5e1",
  },
  {
    label:      "Kinesiología · Rehabilitación",
    icon:       "🏃",
    specialties: ["kinesiología", "kinesiologia", "rehabilitación", "rehabilitacion", "kinesiology"],
    color:      "#1d4ed8",
    bg:         "#eff6ff",
    border:     "#bfdbfe",
  },
];

function getGrupo(professional) {
  const specialty = (professional.specialty || "").toLowerCase().trim();
  if (!specialty) return null;
  return GRUPOS.find(g => g.specialties.some(s => specialty.includes(s) || s.includes(specialty))) || null;
}

export default function AgendaSummarySelector({
  professionals = [],
  mode = "monthly",
  startDate,
  onSelectDay,
  preselectedId = null,
}) {
  const [loading,            setLoading]            = useState(false);
  const [daysByProfessional, setDaysByProfessional] = useState({});

  function getLocalISODate() {
    const now    = new Date();
    const offset = now.getTimezoneOffset();
    const local  = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  const baseDate = getLocalISODate();

  const preselectedProfessional = useMemo(() => {
    if (!preselectedId) return null;
    return professionals.find((p) => p.id === preselectedId) || null;
  }, [professionals, preselectedId]);

  const isSingle = professionals.length === 1 || !!preselectedProfessional;

  const initialIds = useMemo(() => {
    if (preselectedProfessional) return [preselectedProfessional.id];
    if (professionals.length === 1) return [professionals[0]?.id];
    return [];
  }, [professionals, preselectedProfessional]);

  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [appliedIds,  setAppliedIds]  = useState(initialIds);

  useEffect(() => {
    if (preselectedProfessional) {
      setSelectedIds([preselectedProfessional.id]);
      setAppliedIds([preselectedProfessional.id]);
    } else if (professionals.length === 1 && professionals[0]?.id) {
      setSelectedIds([professionals[0].id]);
      setAppliedIds([professionals[0].id]);
    }
  }, [professionals, preselectedProfessional]);

  function toggleProfessional(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  function handleApply() {
    setAppliedIds(selectedIds);
  }

  const rangeCells = useMemo(() => {
    const start = new Date(baseDate);
    const days  = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    const offset = (days[0].getDay() + 6) % 7;
    const cells  = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    days.forEach((d) => cells.push(d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [baseDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadMany(ids) {
      if (!ids.length) return;
      setLoading(true);
      const endpoint = mode === "weekly" ? "/agenda/summary/week" : "/agenda/summary/month";
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res  = await fetch(`${API_URL}${endpoint}?professional=${id}&start_date=${baseDate}`);
              const data = res.ok ? await res.json() : { days: {} };
              return [id, data.days || {}];
            } catch {
              return [id, {}];
            }
          })
        );
        if (!cancelled) {
          setDaysByProfessional((prev) => {
            const next = { ...prev };
            results.forEach(([id, days]) => (next[id] = days));
            return next;
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (isSingle) {
      const id = preselectedProfessional?.id || professionals[0]?.id;
      if (id) loadMany([id]);
    } else {
      loadMany(appliedIds);
    }

    return () => (cancelled = true);
  }, [professionals, appliedIds, baseDate, mode, isSingle, preselectedProfessional]);

  const visibleProfessionals = isSingle
    ? (preselectedProfessional ? [preselectedProfessional] : professionals.slice(0, 1))
    : professionals.filter((p) => appliedIds.includes(p.id));

  // Agrupar por specialty
  const gruposConProfesionales = useMemo(() => {
    return GRUPOS
      .map(g => ({
        ...g,
        members: professionals.filter(p => getGrupo(p)?.label === g.label)
      }))
      .filter(g => g.members.length > 0);
  }, [professionals]);

  // Profesionales sin grupo conocido
  const sinGrupo = useMemo(() =>
    professionals.filter(p => !getGrupo(p)),
  [professionals]);

  return (
    <div className="agenda-summary-selector">

      {/* ── Selector por grupos ── */}
      {!isSingle && (
        <div className="summary-groups">

          {gruposConProfesionales.map(grupo => (
            <div key={grupo.label} className="summary-group">
              <div
                className="summary-group-header"
                style={{ borderColor: grupo.border, background: grupo.bg }}
              >
                <span style={{ fontSize: 16 }}>{grupo.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: grupo.color }}>{grupo.label}</span>
              </div>

              <div className="summary-professionals">
                {grupo.members.map((p) => {
                  const active   = selectedIds.includes(p.id);
                  const disabled = !active && selectedIds.length >= 4;
                  return (
                    <label
                      key={p.id}
                      className={`professional-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                      style={active ? { borderColor: grupo.color, background: grupo.color } : {}}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={disabled}
                        onChange={() => toggleProfessional(p.id)}
                      />
                      <div className="professional-item-info">
                        <span className="professional-item-name">{p.name}</span>
                        {p.specialty && (
                          <span
                            className="professional-item-specialty"
                            style={{ color: active ? "rgba(255,255,255,0.75)" : grupo.color }}
                          >
                            {p.specialty}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Profesionales sin especialidad clasificable */}
          {sinGrupo.length > 0 && (
            <div className="summary-group">
              <div className="summary-professionals">
                {sinGrupo.map((p) => {
                  const active   = selectedIds.includes(p.id);
                  const disabled = !active && selectedIds.length >= 4;
                  return (
                    <label
                      key={p.id}
                      className={`professional-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={disabled}
                        onChange={() => toggleProfessional(p.id)}
                      />
                      <div className="professional-item-info">
                        <span className="professional-item-name">{p.name}</span>
                        {p.specialty && (
                          <span className="professional-item-specialty">{p.specialty}</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="summary-footer">
            <span>{selectedIds.length} / 4 seleccionados</span>
            <button
              className="apply-btn"
              onClick={handleApply}
              disabled={selectedIds.length === 0}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      {loading && <p className="agenda-loading">Cargando agenda…</p>}

      {/* ── Calendarios ── */}
      {visibleProfessionals.map((p) => {
        const grupo = getGrupo(p);

        const backendDays = daysByProfessional[p.id] || {};

        return (
          <div key={p.id} className="month-calendar">
            <div className="month-calendar-header">
              <div className="month-calendar-prof">
                <span className="month-calendar-icon">{grupo?.icon || "👤"}</span>
                <div>
                  <div className="month-calendar-name">{p.name}</div>
                  {p.specialty && (
                    <div className="month-calendar-specialty" style={{ color: grupo?.color || "#475569" }}>
                      {p.specialty}
                    </div>
                  )}
                </div>
              </div>
              {grupo && (
                <span
                  className="month-calendar-badge"
                  style={{ background: grupo.bg, color: grupo.color, border: `1px solid ${grupo.border}` }}
                >
                  {grupo.label}
                </span>
              )}
            </div>

            <div className="month-weekdays">
              {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
            </div>

            <div className="month-grid">
              {rangeCells.map((dateObj, i) => {
                if (!dateObj) return <div key={i} className="day-cell empty" />;

                const yyyy    = dateObj.getFullYear();
                const mm      = String(dateObj.getMonth() + 1).padStart(2, "0");
                const dd      = String(dateObj.getDate()).padStart(2, "0");
                const dateISO = `${yyyy}-${mm}-${dd}`;
                const status  = backendDays[dateISO] || "empty";
                const isToday = dateISO === baseDate;

                return (
                  <button
                    key={dateISO}
                    className={`day-cell ${status} ${isToday ? "today" : ""}`}
                    disabled={status === "empty"}
                    onClick={() => onSelectDay({ professional: p.id, date: dateISO })}
                    style={status !== "empty" && isToday && grupo ? { boxShadow: `0 0 0 2px ${grupo.color}` } : {}}
                  >
                    {dd}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
            }
                  
