// src/scenes/calendar/index.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import FullCalendar, { formatDate } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import axios from "axios";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
  Tooltip,
  Stack,
  Chip,
  TextField,
  Paper,
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Refresh } from "@mui/icons-material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import CustomModal from "../../components/Modal/Modal";
import { BASE_URL } from "../../utils/config";

/* ──────────────────────────────────────────────────────────
   Helpers (fechas, formatos, color por estado)
   ────────────────────────────────────────────────────────── */
const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString(); };
const dfmt = (iso) =>
  iso ? formatDate(iso, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
const statusKey = (s) => String(s || "").trim().toLowerCase();
const getStatusPalette = (theme, s) => {
  const v = statusKey(s);
  if (v.includes("cancel")) return { key: "error", pal: theme.palette.error };
  if (v.includes("pend")) return { key: "warning", pal: theme.palette.warning };
  if (v.includes("out") || v.includes("comp")) return { key: "success", pal: theme.palette.success };
  if (v.includes("in") || v.includes("act")) return { key: "info", pal: theme.palette.info };
  return { key: "primary", pal: theme.palette.primary };
};

/* ──────────────────────────────────────────────────────────
   Componente principal
   ────────────────────────────────────────────────────────── */
export default function Calendar() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewType, setViewType] = useState("dayGridMonth");

  /* ── fetch ─────────────────────────────────────────────── */
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BASE_URL}/reservations`, { withCredentials: true });

      const raw = (data || []).flatMap((r) => {
        const end = addDays(r.checkOutDate, 1);
        return (r.userData || []).map((u) => {
          const fullName = [u.razonSocial, u.nombres, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(" ").trim();
          const doc = u.docNumber || u.dni || u.cedula || "";
          return {
            id: r._id,
            title: `Hab. ${r.room?.number} • ${r.room?.type}`,
            start: r.checkInDate,
            end,
            allDay: false,
            extendedProps: {
              roomNumber: r.room?.number,
              roomType: r.room?.type,
              checkInDate: r.checkInDate,
              checkOutDate: r.checkOutDate,
              guestName: fullName,
              doc,
              nationality: u.nationality || "",
              status: r.status,
            },
          };
        });
      });

      const grouped = raw.reduce((acc, e) => {
        const ep = e.extendedProps;
        const key = `${e.id}-${ep.roomNumber}-${ep.checkInDate}-${ep.checkOutDate}`;
        if (!acc[key]) acc[key] = { ...e, users: [] };
        acc[key].users.push({ name: ep.guestName, doc: ep.doc, nat: ep.nationality });
        return acc;
      }, {});

      const finalEvents = Object.values(grouped).map((e) => {
        const names = e.users.map((u) => u.name).filter(Boolean).join(", ");
        const docs = e.users.map((u) => u.doc).filter(Boolean).join(", ");
        const nats = e.users.map((u) => u.nat).filter(Boolean).join(", ");
        return {
          ...e,
          extendedProps: {
            ...e.extendedProps,
            guests: names || "—",
            docs: docs || "—",
            nationality: nats || "—",
          },
        };
      });

      setEvents(finalEvents);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  /* ── click en evento → detalle ─────────────────────────── */
  const handleEventClick = useCallback(async (clickInfo) => {
    try {
      const id = clickInfo?.event?.id;
      if (!id) return;
      const { data } = await axios.get(`${BASE_URL}/reservations/${id}`, { withCredentials: true });
      setSelectedReservation(data);
      setDetailOpen(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ── render del evento y estilado por estado ───────────── */
  const renderEventContent = (info) => {
    const ep = info.event.extendedProps;
    const { pal } = getStatusPalette(theme, ep.status);
    const isMonth = info.view?.type?.startsWith("dayGridMonth");
    return (
      <Tooltip
        title={
          <div style={{ fontSize: 12 }}>
            <div><b>Hab.:</b> {ep.roomNumber} ({ep.roomType})</div>
            <div><b>Huésped/Empresa:</b> {ep.guests}</div>
            <div><b>Doc(s):</b> {ep.docs}</div>
            <div><b>Ingreso:</b> {dfmt(ep.checkInDate)}</div>
            <div><b>Salida:</b> {dfmt(ep.checkOutDate)}</div>
            <div><b>Estado:</b> {ep.status}</div>
          </div>
        }
        arrow
      >
        <div style={{ fontWeight: 700, color: pal.contrastText, fontSize: isMonth ? 12 : 13, lineHeight: 1.15 }}>
          <span style={{ fontWeight: 800 }}>{info.timeText}</span> {info.event.title}
        </div>
      </Tooltip>
    );
  };

  const eventDidMount = (arg) => {
    const { pal } = getStatusPalette(theme, arg.event.extendedProps.status);
    const isMonth = arg.view?.type?.startsWith("dayGridMonth");
    arg.el.style.background = `linear-gradient(90deg, ${alpha(pal.main, 0.24)}, ${alpha(pal.main, 0.16)})`;
    arg.el.style.borderColor = pal.main;
    arg.el.style.color = pal.contrastText;
    arg.el.style.borderRadius = "8px";
    arg.el.style.padding = isMonth ? "1px 3px" : "2px 4px";
    arg.el.style.margin = isMonth ? "1px 0" : "2px 0";
  };

  /* ── filtros ───────────────────────────────────────────── */
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(events.map((e) => statusKey(e.extendedProps?.status)))).filter(Boolean),
    [events]
  );

  const filterPredicate = useCallback(
    (e) => {
      const ep = e.extendedProps || {};
      const term = q.trim().toLowerCase();
      const s = statusKey(statusFilter);
      const hitTxt =
        !term || `${e.title} ${ep.guests} ${ep.docs} ${ep.roomNumber} ${ep.roomType}`.toLowerCase().includes(term);
      const hitStatus = !s || statusKey(ep.status).includes(s);
      return hitTxt && hitStatus;
    },
    [q, statusFilter]
  );

  // en month, el evento aparece SOLO en el día de inicio
  const calendarEvents = useMemo(() => {
    const base = events.filter(filterPredicate);
    if (viewType.startsWith("dayGridMonth")) {
      return base.map((e) => {
        const { extendedProps, ...rest } = e;
        return { ...rest, extendedProps, end: undefined };
      });
    }
    return base;
  }, [events, filterPredicate, viewType]);

  const sidebarItems = useMemo(
    () =>
      calendarEvents.map((e) => {
        const ep = e.extendedProps;
        return {
          key: `${e.id}-${ep.roomNumber}-${ep.checkInDate}`,
          eventId: e.id,
          title: `Hab. ${ep.roomNumber} • ${ep.roomType}`,
          checkIn: ep.checkInDate,
          checkOut: ep.checkOutDate,
          status: ep.status,
        };
      }),
    [calendarEvents]
  );

  /* ── estilos de FullCalendar (BOTONES completamente) ───── */
  const grad = (main, dark) => `linear-gradient(90deg, ${alpha(main, 0.95)}, ${alpha(dark, 0.9)})`;
  const ring = (c) => `0 0 0 3px ${alpha(c, 0.35)}`;

  const fcStyles = {
    "& .fc-toolbar-title": { fontWeight: 900, letterSpacing: ".2px" },

    // base para TODOS los botones FC
    "& .fc .fc-button": {
      borderRadius: 10,
      border: "none",
      transition: "all .15s ease",
      padding: "6px 12px",
      color: theme.palette.primary.contrastText,
      background: grad(theme.palette.primary.main, theme.palette.primary.dark),
      boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.35)}`,
    },
    "& .fc .fc-button:hover": {
      filter: "saturate(1.05)",
      transform: "translateY(-0.5px)",
    },
    "& .fc .fc-button:disabled": {
      filter: "grayscale(.35) brightness(.9)",
      boxShadow: "none",
      opacity: 0.8,
      transform: "none",
    },
    "& .fc .fc-button:focus-visible": {
      outline: "none",
      boxShadow: ring(theme.palette.primary.main),
    },

    // prev / next => INFO
    "& .fc .fc-prev-button, & .fc .fc-next-button": {
      background: grad(theme.palette.info.main, theme.palette.info.dark),
      color: theme.palette.info.contrastText,
      boxShadow: `0 8px 18px ${alpha(theme.palette.info.main, 0.35)}`,
    },
    "& .fc .fc-prev-button:focus-visible, & .fc .fc-next-button:focus-visible": {
      boxShadow: ring(theme.palette.info.main),
    },

    // hoy => SECONDARY
    "& .fc .fc-today-button": {
      background: grad(theme.palette.secondary.main, theme.palette.secondary.dark),
      color: theme.palette.secondary.contrastText,
      boxShadow: `0 8px 18px ${alpha(theme.palette.secondary.main, 0.35)}`,
      textTransform: "capitalize",
    },
    "& .fc .fc-today-button:focus-visible": {
      boxShadow: ring(theme.palette.secondary.main),
    },

    // toggles de vista (month/week/day/list)
    "& .fc .fc-button-group .fc-button": {
      // estado inactivo = “soft” grisado
      background: alpha(theme.palette.primary.main, 0.12),
      color: theme.palette.text.primary,
      boxShadow: "none",
      border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
    },
    "& .fc .fc-button-group .fc-button:hover": {
      background: alpha(theme.palette.primary.main, 0.18),
    },
    "& .fc .fc-button-group .fc-button:focus-visible": {
      boxShadow: ring(theme.palette.primary.main),
    },
    "& .fc .fc-button-group .fc-button.fc-button-active": {
      background: grad(theme.palette.primary.main, theme.palette.primary.dark),
      color: theme.palette.primary.contrastText,
      boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.35)}`,
      borderColor: "transparent",
    },

    // HOY (día) sutil
    "& .fc .fc-daygrid-day.fc-day-today": {
      backgroundColor: alpha(theme.palette.info.main, 0.06),
    },

    // bordes del grid
    "& .fc-theme-standard .fc-scrollgrid": {
      borderColor: alpha(theme.palette.divider, 0.3),
    },

    // compactar alto de eventos en month
    "& .fc-daygrid-event": {
      padding: 0,
      margin: "1px 0",
    },
  };

  return (
    <Box m="20px">
      <Header title="Calendar" subtitle="Calendario de reservas • sólo visualización" />

      <Box display="flex" gap={2}>
        {/* ————— Sidebar ————— */}
        <Paper
          elevation={0}
          sx={{
            flex: "1 1 24%",
            p: 1.5,
            borderRadius: 2,
            background: colors.primary[400],
            border: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
            minWidth: 280,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="h6" fontWeight={800}>Reservas</Typography>
            <IconButton
              size="small"
              onClick={fetchReservations}
              title="Refrescar"
              sx={{
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.15),
                color: theme.palette.info.main,
                border: `1px solid ${alpha(theme.palette.info.main, 0.4)}`,
                "&:hover": { bgcolor: alpha(theme.palette.info.main, 0.25) },
                "&:active": { transform: "translateY(0.5px)" },
              }}
            >
              <Refresh />
            </IconButton>
          </Stack>

          <TextField
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar (hab., huésped, doc, tipo)"
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />

          {/* Filtro por estado + leyenda dinámica */}
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
            <Chip
              size="small"
              label="Todos"
              color={!statusFilter ? "primary" : "default"}
              onClick={() => setStatusFilter("")}
            />
            {uniqueStatuses.map((s) => {
              const { pal } = getStatusPalette(theme, s);
              const selected = statusFilter === s;
              return (
                <Chip
                  key={s}
                  size="small"
                  label={s || "—"}
                  onClick={() => setStatusFilter(selected ? "" : s)}
                  sx={{
                    border: `1px solid ${pal.main}`,
                    bgcolor: selected ? alpha(pal.main, 0.25) : alpha(pal.main, 0.1),
                    color: pal.main,
                    textTransform: "capitalize",
                  }}
                />
              );
            })}
          </Stack>

          {loading && <Typography variant="body2">Cargando…</Typography>}
          {!loading && sidebarItems.length === 0 && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              No hay reservas para los filtros aplicados.
            </Typography>
          )}

          <List dense sx={{ maxHeight: "60vh", overflowY: "auto" }}>
            {sidebarItems.map((item) => {
              const { pal } = getStatusPalette(theme, item.status);
              return (
                <ListItem
                  key={item.key}
                  sx={{
                    backgroundColor: alpha(pal.main, 0.12),
                    m: "8px 0",
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: `1px solid ${alpha(pal.main, 0.5)}`,
                    transition: "transform .05s",
                    "&:hover": { transform: "translateY(-1px)" },
                  }}
                  onClick={() => handleEventClick({ event: { id: item.eventId } })}
                >
                  <ListItemText
                    primary={<Typography variant="subtitle2" fontWeight={800}>{item.title}</Typography>}
                    secondary={
                      <>
                        <Typography variant="caption">Check-in: {dfmt(item.checkIn)}</Typography><br />
                        <Typography variant="caption">Check-out: {dfmt(item.checkOut)}</Typography>
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {/* ————— Calendario ————— */}
        <Box flex="1 1 100%" sx={fcStyles}>
          <FullCalendar
            height="75vh"
            locales={[esLocale]}
            locale="es"
            timeZone="local"
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
            }}
            initialView="dayGridMonth"
            nowIndicator
            dayMaxEvents
            selectable={false}
            editable={false}
            eventOverlap={false}
            datesSet={(arg) => setViewType(arg.view.type)}
            events={calendarEvents}
            eventContent={renderEventContent}
            eventDidMount={eventDidMount}
            eventClick={handleEventClick}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
            dayCellDidMount={(arg) => {
              const isToday = arg.date.toDateString() === new Date().toDateString();
              if (isToday) arg.el.style.background = alpha(theme.palette.info.main, 0.06);
            }}
          />
        </Box>
      </Box>

      {/* ————— Modal detalle ————— */}
      <CustomModal isOpen={detailOpen} toggle={() => setDetailOpen(false)} title="Detalle de reservación">
        {!selectedReservation ? (
          <Typography>Cargando…</Typography>
        ) : (
          <>
            <Typography><b>Habitación:</b> {selectedReservation.room?.number} ({selectedReservation.room?.type})</Typography>
            <Typography><b>Check-In:</b> {new Date(selectedReservation.checkInDate).toLocaleString()}</Typography>
            <Typography><b>Check-Out:</b> {new Date(selectedReservation.checkOutDate).toLocaleString()}</Typography>
            <Typography><b>Estado:</b> {selectedReservation.status}</Typography>

            <Typography mt={2}><b>Huéspedes / Empresas:</b></Typography>
            <ul style={{ paddingLeft: 18, marginTop: 6 }}>
              {(selectedReservation.userData || []).map((u, i) => (
                <li key={i}>
                  {u.razonSocial ? (
                    <span><b>{u.razonSocial}</b> • RUC {u.docNumber} • {u.direccion || "—"}</span>
                  ) : (
                    <span>
                      {[u.nombres, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(" ")} • {u.docType} {u.docNumber}
                    </span>
                  )}
                  {u.nationality ? ` • ${u.nationality}` : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </CustomModal>
    </Box>
  );
}
