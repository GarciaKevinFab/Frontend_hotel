// src/scenes/rooms/RoomManager.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import RoomForm from "../../components/Room/RoomForm";
import RoomList from "../../components/Room/RoomList";
import CustomModal from "../../components/Modal/Modal";
import { Button } from "reactstrap";
import { toast } from "react-toastify";
import "./RoomManager.css";
import { BASE_URL } from "../../utils/config"; // <-- usa tu config

// Hook: calcula items por página para 2 filas basado en el ancho del contenedor
function useResponsiveItemsPerPage({ rows = 2, minCardWidth = 260, gap = 16 } = {}) {
    const ref = useRef(null);
    const [cols, setCols] = useState(1);

    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;

        const compute = () => {
            const width = el.getBoundingClientRect().width || 0;
            // columns = floor((width + gap) / (minCardWidth + gap))
            const c = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
            setCols(c);
        };

        compute();
        const ro = new ResizeObserver(() => compute());
        ro.observe(el);

        // recálculo por seguridad al resize de ventana (Safari)
        const onWin = () => compute();
        window.addEventListener("resize", onWin);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", onWin);
        };
    }, [gap, minCardWidth]);

    const itemsPerPage = cols * rows;
    return { containerRef: ref, cols, itemsPerPage };
}

const RoomManager = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);

    // axios con baseURL fija desde utils
    const api = useMemo(() => axios.create({ baseURL: BASE_URL }), []);

    // filtros / orden
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [sortBy, setSortBy] = useState("number-asc");

    // paginación
    const { containerRef, itemsPerPage } = useResponsiveItemsPerPage({ rows: 2, minCardWidth: 260, gap: 16 });
    const [page, setPage] = useState(1);

    // form/modal
    const [modalOpen, setModalOpen] = useState(false);
    const [roomData, setRoomData] = useState({
        number: "",
        type: "",
        status: "available",
        price: "",
    });

    const fetchRooms = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/rooms");
            setRooms(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Failed to fetch rooms");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    // métricas rápidas
    const stats = useMemo(() => {
        const s = { total: rooms.length, available: 0, occupied: 0, cleaning: 0, maintenance: 0 };
        rooms.forEach(r => { s[r.status] = (s[r.status] || 0) + 1; });
        return s;
    }, [rooms]);

    // filtrado + orden
    const filtered = useMemo(() => {
        const ql = q.trim().toLowerCase();
        let out = rooms.filter(r => {
            const matchesQ =
                !ql ||
                String(r.number ?? "").toLowerCase().includes(ql) ||
                String(r.type ?? "").toLowerCase().includes(ql);
            const matchesStatus = status === "all" || r.status === status;
            return matchesQ && matchesStatus;
        });

        out.sort((a, b) => {
            switch (sortBy) {
                case "number-desc":
                    return Number(b.number) - Number(a.number);
                case "price-asc":
                    return Number(a.price ?? 0) - Number(b.price ?? 0);
                case "price-desc":
                    return Number(b.price ?? 0) - Number(a.price ?? 0);
                case "type-asc":
                    return String(a.type ?? "").localeCompare(String(b.type ?? ""));
                case "type-desc":
                    return String(b.type ?? "").localeCompare(String(a.type ?? ""));
                default: // number-asc
                    return Number(a.number) - Number(b.number);
            }
        });
        return out;
    }, [rooms, q, status, sortBy]);

    // total de páginas (2 filas máx por página)
    const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, itemsPerPage)));

    // si cambian filtros/orden, volver a la página 1
    useEffect(() => { setPage(1); }, [q, status, sortBy]);

    // si cambia itemsPerPage o totalPages, corrige page si quedó fuera de rango
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    // slice para esta página
    const paginatedRooms = useMemo(() => {
        const start = (page - 1) * Math.max(1, itemsPerPage);
        const end = start + Math.max(1, itemsPerPage);
        return filtered.slice(start, end);
    }, [filtered, page, itemsPerPage]);

    const handleEdit = (id) => {
        const room = rooms.find(r => r._id === id);
        if (!room) return;
        setRoomData({
            _id: room._id,
            number: room.number ?? "",
            type: room.type ?? "",
            status: room.status ?? "available",
            price: room.price ?? "",
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        const prev = rooms;
        setRooms(rs => rs.filter(r => r._id !== id)); // optimista
        try {
            await api.delete(`/rooms/${id}`);
            toast.success("Room deleted successfully");
        } catch (e) {
            setRooms(prev); // rollback
            toast.error("Failed to delete room");
            console.error(e);
        }
    };

    // 👇 Doble clic en tarjeta cuando esté en cleaning => available
    const handleQuickToggle = async (id) => {
        const r = rooms.find(x => x._id === id);
        if (!r) return;

        if (r.status !== "cleaning") {
            toast.info("Solo aplica cuando la habitación está en limpieza.");
            return;
        }

        const prev = rooms;
        // Optimista
        setRooms(rs => rs.map(x => x._id === id ? { ...x, status: "available" } : x));

        try {
            await api.put(`/rooms/${id}`, { status: "available" });
            toast.success("Habitación marcada como disponible.");
            fetchRooms(); // refresca
        } catch (e) {
            setRooms(prev); // rollback
            toast.error("No se pudo actualizar el estado.");
            console.error(e);
        }
    };

    const toggleModal = () => {
        const willOpen = !modalOpen;
        setModalOpen(willOpen);
        if (willOpen) {
            setRoomData({ number: "", type: "", status: "available", price: "" });
        }
    };

    return (
        <div className="room-manager theme-dark">
            <header className="rm-header">
                <div>
                    <h1 className="room-manager-title">Room Manager</h1>
                    <p className="rm-sub">Administra habitaciones, estados y tarifas con rapidez.</p>
                </div>

                <div className="rm-stats">
                    <div className="rm-stat">
                        <span className="kpi">{stats.total}</span>
                        <span className="lbl">Total</span>
                    </div>
                    <div className="rm-stat ok">
                        <span className="kpi">{stats.available}</span>
                        <span className="lbl">Disponibles</span>
                    </div>
                    <div className="rm-stat warn">
                        <span className="kpi">{stats.occupied}</span>
                        <span className="lbl">Ocupadas</span>
                    </div>
                    <div className="rm-stat info">
                        <span className="kpi">{stats.cleaning}</span>
                        <span className="lbl">Limpieza</span>
                    </div>
                </div>
            </header>

            <div className="rm-toolbar">
                <div className="rm-search">
                    <input
                        className="rm-input"
                        type="search"
                        placeholder="Buscar por número o tipo…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>

                <div className="rm-filters">
                    <select
                        className="rm-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        title="Filtrar por estado"
                    >
                        <option value="all">Todos</option>
                        <option value="available">Disponibles</option>
                        <option value="occupied">Ocupadas</option>
                        <option value="maintenance">Mantenimiento</option>
                    </select>

                    <select
                        className="rm-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        title="Ordenar"
                    >
                        <option value="number-asc">N° asc</option>
                        <option value="number-desc">N° desc</option>
                        <option value="type-asc">Tipo A→Z</option>
                        <option value="type-desc">Tipo Z→A</option>
                        <option value="price-asc">Precio ↑</option>
                        <option value="price-desc">Precio ↓</option>
                    </select>

                    <Button color="primary" onClick={toggleModal} className="add-room-btn">
                        + Add Room
                    </Button>
                </div>
            </div>

            {/* Contenedor que se usa para medir ancho y calcular columnas */}
            <div ref={containerRef}>
                {loading ? (
                    <div className="room-list-container skeleton">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div className="room-card sk" key={i}>
                                <div className="sk-bar w40" />
                                <div className="sk-bar w60" />
                                <div className="sk-chip" />
                                <div className="sk-actions">
                                    <div className="sk-btn" /><div className="sk-btn" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rm-empty">
                        <div className="empty-emoji">🛏️</div>
                        <p>No hay habitaciones que coincidan con tu búsqueda.</p>
                        <Button color="primary" onClick={toggleModal} className="add-room-btn">
                            Crear habitación
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* RoomList recibe SOLO las habitaciones de esta página */}
                        <RoomList
                            rooms={paginatedRooms}
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            onQuickToggle={handleQuickToggle}
                        />

                        {/* Paginación (sólo si hay más de 1 página) */}
                        {totalPages > 1 && (
                            <div className="room-pagination">
                                <button
                                    className="rm-page-btn"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    ◀ Anterior
                                </button>

                                <div className="rm-page-info">
                                    Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                                    <span className="rm-page-count">
                                        &nbsp;•&nbsp; Mostrando {paginatedRooms.length} de {filtered.length}
                                    </span>
                                </div>

                                <button
                                    className="rm-page-btn"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Siguiente ▶
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <CustomModal isOpen={modalOpen} toggle={toggleModal} title="Add / Edit Room">
                <RoomForm
                    fetchRooms={fetchRooms}
                    roomData={roomData}
                    setRoomData={setRoomData}
                    closeModal={toggleModal}
                    rooms={rooms}          // 👈 pásale la lista
                    api={api}              // 👈 reutiliza axios con baseURL correcto
                />
            </CustomModal>
        </div>
    );
};

export default RoomManager;
