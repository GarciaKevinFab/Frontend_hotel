// src/scenes/Reports/index.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
    Box,
    Typography,
    Button,
    useTheme,
    TextField,
    Stack,
    Tabs,
    Tab,
    Chip,
    Paper,
    Tooltip,
    Alert,
    LinearProgress,
    MenuItem,
    Menu,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import Header from "../../components/Header";
import CustomModal from "../../components/Modal/Modal";
import ExtendStayModal from "../../components/Reservations/ExtendStayModal";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { BASE_URL } from "../../utils/config";
import {
    Refresh,
    Download,
    FilterAlt,
    CleaningServices,
    PictureAsPdf,
    Visibility,
    EventRepeat,
    Edit as EditIcon,
    DeleteForever,
    MoreVert,
} from "@mui/icons-material";
import { tokens } from "../../theme";

// ————————————————————————————————————————————————
// Utilidades
// ————————————————————————————————————————————————
const dfmt = (iso) => (iso ? new Date(iso).toLocaleString("es-PE") : "-");
const money = (v) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
        Number(v || 0)
    );
const diffNights = (ci, co) => {
    if (!ci || !co) return 0;
    const A = new Date(ci),
        B = new Date(co);
    const ms = B - A;
    const n = Math.round(ms / (1000 * 60 * 60 * 24));
    return n > 0 ? n : 0;
};

// Paleta semántica coherente para botones
const btn = {
    base: {
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: ".2px",
    },
    solid: (theme, key) => ({
        color: theme.palette[key].contrastText,
        background: `linear-gradient(90deg, ${alpha(
            theme.palette[key].main,
            0.95
        )}, ${alpha(theme.palette[key].dark || theme.palette[key].main, 0.92)})`,
        boxShadow: `0 8px 20px ${alpha(theme.palette[key].main, 0.35)}`,
        "&:hover": {
            background: `linear-gradient(90deg, ${alpha(
                theme.palette[key].dark || theme.palette[key].main,
                0.98
            )}, ${alpha(theme.palette[key].main, 0.98)})`,
            boxShadow: `0 8px 26px ${alpha(
                theme.palette[key].dark || theme.palette[key].main,
                0.45
            )}`,
        },
        "&.Mui-disabled": {
            color: alpha(theme.palette[key].contrastText, 0.7),
            background: alpha(theme.palette[key].main, 0.45),
            boxShadow: "none",
        },
    }),
    outline: (theme, key) => ({
        color: theme.palette[key].main,
        borderColor: alpha(theme.palette[key].main, 0.6),
        "&:hover": {
            borderColor: theme.palette[key].main,
            backgroundColor: alpha(theme.palette[key].main, 0.08),
        },
    }),
    soft: (theme, key) => ({
        color: theme.palette[key].main,
        borderColor: alpha(theme.palette[key].main, 0.35),
        backgroundColor: alpha(theme.palette[key].main, 0.12),
        "&:hover": {
            backgroundColor: alpha(theme.palette[key].main, 0.2),
        },
    }),
};

// Estado → color MUI
const statusColorKey = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("cancel")) return "error";
    if (s.includes("pend")) return "warning";
    if (s.includes("out") || s.includes("comp")) return "success";
    if (s.includes("in") || s.includes("act")) return "success";
    return "info";
};

// ————————————————————————————————————————————————
// HOOKS
// ————————————————————————————————————————————————
function useReportsFiles() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const { data } = await axios.get(`${BASE_URL}/reports`, {
                withCredentials: true,
            });
            setReports((data || []).map((fileName, index) => ({ id: index + 1, fileName })));
        } catch (e) {
            console.error(e);
            setError("No se pudieron cargar los reportes.");
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return { reports, loading, error, load };
}

function useReservations(from, to) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef();

    const fetchReservations = useCallback(async () => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            setError(null);
            setLoading(true);
            const q = new URLSearchParams();
            if (from) q.append("from", from);
            if (to) q.append("to", to);
            const url = `${BASE_URL}/reservations${q.toString() ? `?${q.toString()}` : ""}`;

            const { data } = await axios.get(url, {
                withCredentials: true,
                signal: controller.signal,
            });
            const flat = (data || []).map((r) => {
                const nights = diffNights(r.checkInDate, r.checkOutDate);
                const price = r.room?.price || 0;
                return {
                    id: r._id || `${r.room?.number}-${r.checkInDate}-${r.checkOutDate}`,
                    roomNumber: r.room?.number,
                    roomType: r.room?.type,
                    checkInDate: r.checkInDate,
                    checkOutDate: r.checkOutDate,
                    status: r.status,
                    guests: (r.userData || [])
                        .map((u) =>
                            u.razonSocial
                                ? `${u.razonSocial} (RUC ${u.docNumber})`
                                : `${[u.nombres, u.apellidoPaterno, u.apellidoMaterno]
                                    .filter(Boolean)
                                    .join(" ")}`
                        )
                        .join(", "),
                    docs: (r.userData || []).map((u) => u.docNumber || u.dni || u.cedula || "").join(", "),
                    nationality: (r.userData || []).map((u) => u.nationality || "").join(", "),
                    price,
                    nights,
                    total: price * nights,
                    raw: r,
                };
            });
            setRows(flat);
        } catch (e) {
            if (axios.isCancel?.(e) || e?.name === "CanceledError") return;
            console.error(e);
            setError("No se pudieron cargar las reservas.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    return { rows, loading, error, refetch: fetchReservations };
}

// ————————————————————————————————————————————————
// SUBCOMPONENTES
// ————————————————————————————————————————————————
function StatusPill({ value }) {
    const theme = useTheme();
    const key = statusColorKey(value);
    const base = theme.palette[key].main;
    return (
        <Chip
            label={value || "—"}
            size="small"
            variant="outlined"
            sx={{
                borderColor: base,
                color: base,
                bgcolor: alpha(base, 0.08),
                textTransform: "capitalize",
            }}
        />
    );
}

function FilesTab({ colors }) {
    const theme = useTheme();
    const { reports, loading, error, load } = useReportsFiles();

    useEffect(() => {
        load();
    }, [load]);

    const fileColumns = useMemo(
        () => [
            { field: "id", headerName: "ID", width: 90 },
            { field: "fileName", headerName: "Archivo", flex: 1.5, minWidth: 220 },
            {
                field: "download",
                headerName: "Descargar",
                flex: 0.8,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<Download />}
                        sx={[btn.base, btn.solid(theme, "primary")]}
                        onClick={() =>
                            window.open(
                                `${BASE_URL.replace("/api", "")}/reports/${encodeURIComponent(params.row.fileName)}`,
                                "_blank"
                            )
                        }
                    >
                        Descargar
                    </Button>
                ),
            },
        ],
        [theme]
    );

    return (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    sx={[btn.base, btn.outline(theme, "info")]}
                    onClick={load}
                    disabled={loading}
                >
                    {loading ? "Cargando..." : "Refrescar"}
                </Button>
                <Button
                    variant="contained"
                    startIcon={<Download />}
                    sx={[btn.base, btn.solid(theme, "secondary")]}
                    onClick={async () => {
                        try {
                            await axios.get(`${BASE_URL}/reports/generate`, { withCredentials: true });
                            await load();
                        } catch (e) {
                            console.error("Error al generar:", e);
                        }
                    }}
                >
                    Generar reporte
                </Button>
            </Stack>

            {!!error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

            {!loading && !error && reports.length === 0 && (
                <Typography sx={{ mb: 1 }}>No hay archivos de reportes aún.</Typography>
            )}

            <Box
                height="70vh"
                sx={{
                    "& .MuiDataGrid-root": { border: "none" },
                    "& .MuiDataGrid-cell": { borderBottom: "none" },
                    "& .MuiDataGrid-columnHeaders": {
                        background: `linear-gradient(90deg, ${alpha(colors.blueAccent[700], 0.9)}, ${alpha(theme.palette.primary.main, 0.4)})`,
                        borderBottom: "none",
                    },
                    "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
                    "& .MuiDataGrid-footerContainer": {
                        borderTop: "none",
                        backgroundColor: colors.blueAccent[700],
                    },
                }}
            >
                <DataGrid
                    rows={reports}
                    columns={fileColumns}
                    loading={loading}
                    components={{ LoadingOverlay: LinearProgress }}
                    getRowId={(r) => r.id}
                    disableRowSelectionOnClick
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                />
            </Box>
        </Box>
    );
}

// ————————————————————————————————————————————————
// Modal de Edición
// ————————————————————————————————————————————————
function toLocalInput(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function EditReservationModal({ isOpen, onClose, reservation, onEdited }) {
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [status, setStatus] = useState("");
    const [saving, setSaving] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        if (reservation) {
            setCheckIn(toLocalInput(reservation.checkInDate));
            setCheckOut(toLocalInput(reservation.checkOutDate));
            setStatus(reservation.status || "reserved");
        } else {
            setCheckIn("");
            setCheckOut("");
            setStatus("reserved");
        }
    }, [reservation]);

    const handleSave = async () => {
        if (!reservation?._id) return;
        const patch = {};
        if (checkIn) patch.checkInDate = new Date(checkIn).toISOString();
        if (checkOut) patch.checkOutDate = new Date(checkOut).toISOString();
        if (status) patch.status = status;

        setSaving(true);
        try {
            const { data } = await axios.patch(`${BASE_URL}/reservations/${reservation._id}`, patch, {
                withCredentials: true,
            });
            onEdited?.(data);
            onClose();
        } catch (e) {
            console.error("Error al editar reserva:", e);
            alert(e?.response?.data?.error || e?.message || "No se pudo editar la reserva.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <CustomModal isOpen={isOpen} toggle={onClose} title="Editar reservación">
            {!reservation ? (
                <Typography>Cargando…</Typography>
            ) : (
                <Stack spacing={1.2}>
                    <TextField
                        label="Check-In"
                        type="datetime-local"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                    <TextField
                        label="Check-Out"
                        type="datetime-local"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                    <TextField select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} size="small">
                        {["reserved", "checked_in", "checked_out", "cancelled"].map((s) => (
                            <MenuItem key={s} value={s}>
                                {s}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
                        <Button onClick={onClose} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button variant="contained" onClick={handleSave} disabled={saving} sx={[btn.base, btn.solid(theme, "success")]}>
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </Stack>
                </Stack>
            )}
        </CustomModal>
    );
}

// ————————————————————————————————————————————————
// Acciones por fila (CTA + menú Más)
// ————————————————————————————————————————————————
function RowActions({ row, onView, onExtend, onEdit, onDelete, onPdf }) {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const status = String(row.status || "").toLowerCase();
    const canExtend = status.includes("reserved") || status.includes("check"); // reserved / checked-in

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Ver detalle">
                <span>
                    <Button size="small" startIcon={<Visibility />} sx={[btn.base, btn.soft(theme, "info")]} onClick={onView}>
                        Detalle
                    </Button>
                </span>
            </Tooltip>

            <Tooltip title={canExtend ? "Extender estadía" : "No disponible para este estado"}>
                <span>
                    <Button
                        size="small"
                        startIcon={<EventRepeat />}
                        sx={[btn.base, btn.solid(theme, "success")]}
                        disabled={!canExtend}
                        onClick={onExtend}
                    >
                        Extender
                    </Button>
                </span>
            </Tooltip>

            <Tooltip title="Más acciones">
                <span>
                    <Button
                        size="small"
                        aria-haspopup="menu"
                        aria-expanded={open ? "true" : undefined}
                        aria-controls={open ? "row-actions-menu" : undefined}
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        sx={[btn.base, btn.solid(theme, "secondary")]}
                        startIcon={<MoreVert />}
                    >
                        Más
                    </Button>
                </span>
            </Tooltip>

            <Menu
                id="row-actions-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <MenuItem
                    onClick={() => {
                        setAnchorEl(null);
                        onEdit();
                    }}
                >
                    <EditIcon fontSize="small" style={{ marginRight: 8 }} />
                    Editar
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        setAnchorEl(null);
                        onPdf();
                    }}
                >
                    <PictureAsPdf fontSize="small" style={{ marginRight: 8 }} />
                    Exportar PDF
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        setAnchorEl(null);
                        onDelete();
                    }}
                    sx={{ color: theme.palette.error.main }}
                >
                    <DeleteForever fontSize="small" style={{ marginRight: 8 }} />
                    Eliminar
                </MenuItem>
            </Menu>
        </Stack>
    );
}

// ————————————————————————————————————————————————
// Reservas (tabla + acciones)
// ————————————————————————————————————————————————
function ReservationsTab({ colors }) {
    const theme = useTheme();

    // Filtros
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Datos
    const { rows, loading, error, refetch } = useReservations(from, to);
    const [selection, setSelection] = useState([]);
    const [detailOpen, setDetailOpen] = useState(false);
    const [extendOpen, setExtendOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);

    // NUEVO: estados para editar y eliminar
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const uniqueStatuses = useMemo(
        () => Array.from(new Set(rows.map((r) => String(r.status || "").trim()))).filter(Boolean),
        [rows]
    );

    const rowsView = useMemo(() => {
        const s = statusFilter.toLowerCase();
        return s ? rows.filter((r) => String(r.status || "").toLowerCase().includes(s)) : rows;
    }, [rows, statusFilter]);

    const handleEdit = useCallback((row) => {
        setSelectedReservation(row.raw);
        setEditOpen(true);
    }, []);
    const handleDelete = useCallback((row) => {
        setSelectedReservation(row.raw);
        setDeleteOpen(true);
    }, []);

    const downloadRowPDF = useCallback((row) => {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(`Reserva: ${row.id}`, 14, 18);
        doc.setFontSize(11);
        doc.text(`Habitación: ${row.roomNumber} (${row.roomType})`, 14, 28);
        doc.text(`Huésped/Empresa: ${row.guests}`, 14, 36);
        doc.text(`Doc(s): ${row.docs}`, 14, 44);
        doc.text(`Nacionalidad: ${row.nationality || "-"}`, 14, 52);
        doc.text(`Check-In: ${dfmt(row.checkInDate)}`, 14, 60);
        doc.text(`Check-Out: ${dfmt(row.checkOutDate)}`, 14, 68);
        doc.text(`Noches: ${row.nights}`, 14, 76);
        doc.text(`Tarifa: ${money(row.price)}`, 14, 84);
        doc.text(`Total: ${money(row.total)}`, 14, 92);
        doc.text(`Estado: ${row.status}`, 14, 100);
        doc.save(`reserva_${row.roomNumber}_${row.id}.pdf`);
    }, []);

    const columns = useMemo(
        () => [
            { field: "roomNumber", headerName: "Hab.", width: 90 },
            { field: "roomType", headerName: "Tipo", width: 120 },
            { field: "guests", headerName: "Huésped/Empresa", flex: 1.3, minWidth: 240 },
            { field: "docs", headerName: "Doc(s)", flex: 1, minWidth: 160 },
            {
                field: "checkInDate",
                headerName: "Check-In",
                flex: 0.9,
                valueFormatter: (p) => dfmt(p.value),
            },
            {
                field: "checkOutDate",
                headerName: "Check-Out",
                flex: 0.9,
                valueFormatter: (p) => dfmt(p.value),
            },
            { field: "nights", headerName: "Noches", width: 100 },
            { field: "price", headerName: "Tarifa", width: 110, valueFormatter: (p) => money(p.value) },
            { field: "total", headerName: "Total", width: 120, valueFormatter: (p) => money(p.value) },
            {
                field: "status",
                headerName: "Estado",
                width: 140,
                renderCell: (params) => <StatusPill value={params.value} />,
                sortComparator: (a, b) => String(a).localeCompare(String(b)),
            },
            {
                field: "actions",
                headerName: "Acciones",
                width: 320,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                    <RowActions
                        row={params.row}
                        onView={() => {
                            setSelectedReservation(params.row.raw);
                            setDetailOpen(true);
                        }}
                        onExtend={() => {
                            setSelectedReservation(params.row.raw);
                            setExtendOpen(true);
                        }}
                        onEdit={() => handleEdit(params.row)}
                        onDelete={() => handleDelete(params.row)}
                        onPdf={() => downloadRowPDF(params.row)}
                    />
                ),
            },
        ],
        [handleEdit, handleDelete, downloadRowPDF]
    );

    const exportSelectedToPDF = useCallback(() => {
        const doc = new jsPDF({ orientation: "landscape" });
        const base = selection.length ? rowsView.filter((r) => selection.includes(r.id)) : rowsView;
        const head = [
            ["Hab.", "Tipo", "Huésped/Empresa", "Doc(s)", "Check-In", "Check-Out", "Noches", "Tarifa", "Total", "Estado"],
        ];
        const body = base.map((r) => [
            r.roomNumber,
            r.roomType,
            r.guests,
            r.docs,
            dfmt(r.checkInDate),
            dfmt(r.checkOutDate),
            r.nights,
            money(r.price),
            money(r.total),
            r.status,
        ]);
        doc.setFontSize(12);
        doc.text(`Reservas (${base.length})`, 14, 14);
        doc.autoTable({ head, body, startY: 20, styles: { fontSize: 8 } });
        doc.save(`reservas_${from || "all"}_${to || ""}.pdf`);
    }, [rowsView, selection, from, to]);

    // KPIs
    const kpis = useMemo(() => {
        const arr = rowsView;
        const count = arr.length;
        const nights = arr.reduce((acc, r) => acc + (r.nights || 0), 0);
        const revenue = arr.reduce((acc, r) => acc + (r.total || 0), 0);
        return { count, nights, revenue };
    }, [rowsView]);

    return (
        <>
            {/* Filtros sticky */}
            <Paper
                elevation={0}
                sx={{
                    mb: 1,
                    p: 1,
                    position: "sticky",
                    top: 8,
                    zIndex: 5,
                    background: `linear-gradient(90deg, ${alpha(colors.primary[400], 0.9)}, ${alpha(theme.palette.primary.dark, 0.4)})`,
                    border: `1px solid ${colors.blueAccent[700]}`,
                    borderRadius: 1.5,
                }}
            >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                    <TextField
                        type="date"
                        label="Desde"
                        InputLabelProps={{ shrink: true }}
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        size="small"
                    />
                    <TextField
                        type="date"
                        label="Hasta"
                        InputLabelProps={{ shrink: true }}
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        size="small"
                    />
                    <Stack direction="row" spacing={1}>
                        <Button startIcon={<FilterAlt />} sx={[btn.base, btn.solid(theme, "primary")]} onClick={refetch}>
                            Filtrar
                        </Button>
                        <Button
                            startIcon={<CleaningServices />}
                            sx={[btn.base, btn.soft(theme, "warning")]}
                            onClick={() => {
                                setFrom("");
                                setTo("");
                                setStatusFilter("");
                                refetch();
                            }}
                        >
                            Limpiar
                        </Button>
                    </Stack>
                    {/* Filtro por estado dinámico */}
                    <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, sm: "auto" }, flexWrap: "wrap" }}>
                        {uniqueStatuses.map((s) => {
                            const selected = statusFilter.toLowerCase() === String(s).toLowerCase();
                            const base = theme.palette[statusColorKey(s)].main;
                            return (
                                <Chip
                                    key={s || "-"}
                                    size="small"
                                    label={s || "—"}
                                    variant={selected ? "filled" : "outlined"}
                                    onClick={() => setStatusFilter(selected ? "" : s)}
                                    sx={{
                                        borderColor: base,
                                        bgcolor: selected ? alpha(base, 0.25) : alpha(base, 0.1),
                                        color: base,
                                        textTransform: "capitalize",
                                    }}
                                />
                            );
                        })}
                    </Stack>
                </Stack>
            </Paper>

            {!!error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

            {/* KPIs */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
                <Paper sx={{ p: 1.2, flex: 1, border: `1px solid ${colors.blueAccent[700]}` }}>
                    <Typography variant="caption" color="text.secondary">
                        Reservas
                    </Typography>
                    <Typography variant="h6">{kpis.count}</Typography>
                </Paper>
                <Paper sx={{ p: 1.2, flex: 1, border: `1px solid ${colors.blueAccent[700]}` }}>
                    <Typography variant="caption" color="text.secondary">
                        Noches
                    </Typography>
                    <Typography variant="h6">{kpis.nights}</Typography>
                </Paper>
                <Paper sx={{ p: 1.2, flex: 1, border: `1px solid ${colors.blueAccent[700]}` }}>
                    <Typography variant="caption" color="text.secondary">
                        Ingresos estimados
                    </Typography>
                    <Typography variant="h6">{money(kpis.revenue)}</Typography>
                </Paper>
            </Stack>

            {/* Tabla */}
            <Box
                height="70vh"
                sx={{
                    "& .MuiDataGrid-root": { border: "none" },
                    "& .MuiDataGrid-cell": { borderBottom: "none" },
                    "& .MuiDataGrid-columnHeaders": {
                        background: `linear-gradient(90deg, ${alpha(colors.blueAccent[700], 0.9)}, ${alpha(theme.palette.primary.main, 0.4)})`,
                        borderBottom: "none",
                    },
                    "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
                    "& .MuiDataGrid-footerContainer": {
                        borderTop: "none",
                        backgroundColor: colors.blueAccent[700],
                    },
                }}
            >
                <DataGrid
                    rows={rowsView}
                    columns={columns}
                    loading={loading}
                    components={{ LoadingOverlay: LinearProgress }}
                    getRowId={(r) => r.id}
                    checkboxSelection
                    disableRowSelectionOnClick
                    onRowSelectionModelChange={(m) => setSelection(m)}
                    rowSelectionModel={selection}
                    getRowClassName={(p) =>
                        `row-st-${String(p.row.status || "").trim().toLowerCase().replace(/\s+/g, "-")}`
                    }
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: "checkInDate", sort: "desc" }] },
                        columns: { columnVisibilityModel: { nationality: false } },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
                />
            </Box>

            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mt: 1 }}
            >
                <Tooltip
                    title={
                        selection.length
                            ? "Exporta sólo lo seleccionado"
                            : "No seleccionaste filas: exportará lo filtrado"
                    }
                >
                    <span>
                        <Button
                            startIcon={<PictureAsPdf />}
                            sx={[btn.base, btn.outline(theme, "secondary")]}
                            onClick={exportSelectedToPDF}
                            disabled={!rowsView.length}
                        >
                            Exportar {selection.length ? "selección" : "filtrado"} a PDF
                        </Button>
                    </span>
                </Tooltip>
            </Stack>

            {/* MODAL DETALLE */}
            <CustomModal isOpen={detailOpen} toggle={() => setDetailOpen(false)} title="Detalle de reservación">
                {!selectedReservation ? (
                    <Typography>Cargando…</Typography>
                ) : (
                    <Box>
                        <Typography>
                            <b>Habitación:</b> {selectedReservation.room?.number} ({selectedReservation.room?.type})
                        </Typography>
                        <Typography>
                            <b>Check-In:</b> {dfmt(selectedReservation.checkInDate)}
                        </Typography>
                        <Typography>
                            <b>Check-Out:</b> {dfmt(selectedReservation.checkOutDate)}
                        </Typography>
                        <Typography>
                            <b>Estado:</b> {selectedReservation.status}
                        </Typography>
                        <Typography mt={2}>
                            <b>Huéspedes / Empresas:</b>
                        </Typography>
                        <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                            {(selectedReservation.userData || []).map((u, i) => (
                                <li key={i}>
                                    {u.razonSocial ? (
                                        <span>
                                            <b>{u.razonSocial}</b> • RUC {u.docNumber} • {u.direccion || "—"}
                                        </span>
                                    ) : (
                                        <span>
                                            {[u.nombres, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(" ")} • {u.docType}{" "}
                                            {u.docNumber}
                                        </span>
                                    )}
                                    {u.nationality ? ` • ${u.nationality}` : null}
                                </li>
                            ))}
                        </ul>
                    </Box>
                )}
            </CustomModal>

            {/* MODAL EXTENSIÓN */}
            <ExtendStayModal
                isOpen={extendOpen}
                toggle={() => setExtendOpen(false)}
                reservation={
                    selectedReservation ? { _id: selectedReservation._id, checkOutDate: selectedReservation.checkOutDate } : null
                }
                onExtended={() => {
                    setExtendOpen(false);
                    refetch();
                }}
            />

            {/* MODAL EDITAR */}
            <EditReservationModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                reservation={selectedReservation}
                onEdited={() => {
                    setEditOpen(false);
                    refetch();
                }}
            />

            {/* MODAL CONFIRMAR ELIMINACIÓN */}
            <CustomModal isOpen={deleteOpen} toggle={() => setDeleteOpen(false)} title="Eliminar reservación">
                {!selectedReservation ? (
                    <Typography>Cargando…</Typography>
                ) : (
                    <Box>
                        <Typography sx={{ mb: 1.5 }}>
                            ¿Seguro que deseas <b>eliminar</b> la reserva de la habitación <b>{selectedReservation.room?.number}</b>?
                        </Typography>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
                            <Button
                                color="error"
                                variant="contained"
                                onClick={async () => {
                                    try {
                                        await axios.delete(`${BASE_URL}/reservations/${selectedReservation._id}`, { withCredentials: true });
                                        setDeleteOpen(false);
                                        setSelectedReservation(null);
                                        refetch();
                                    } catch (e) {
                                        console.error("Error al eliminar:", e);
                                        alert(e?.response?.data?.error || e?.message || "No se pudo eliminar la reserva.");
                                    }
                                }}
                            >
                                Sí, eliminar
                            </Button>
                        </Stack>
                    </Box>
                )}
            </CustomModal>
        </>
    );
}

// ————————————————————————————————————————————————
// Página principal
// ————————————————————————————————————————————————
export default function Reports() {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [tab, setTab] = useState(1); // abre en Reservas

    return (
        <Box m="20px">
            <Header title="Reports" subtitle="Descarga de archivos y panel de reservas con exportaciones" />

            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ mb: 2, borderBottom: `1px solid ${colors.blueAccent[700]}` }}
                textColor="inherit"
                indicatorColor="secondary"
                variant="fullWidth"
            >
                <Tab label="Archivos" />
                <Tab label="Reservas" />
            </Tabs>

            {tab === 0 ? <FilesTab colors={colors} /> : <ReservationsTab colors={colors} />}
        </Box>
    );
}
