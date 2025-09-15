import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Form, Label } from "reactstrap";
import { toast } from "react-toastify";
import { BASE_URL } from "../../utils/config";

/**
 * RoomForm (con anti-duplicados)
 * - Chequeo en cliente: no permite crear/actualizar con número repetido
 * - Maneja 409 del backend (índice único) y muestra mensaje claro
 * - Usa BASE_URL; si se pasa `api` desde arriba, lo reutiliza
 */
const RoomForm = ({ fetchRooms, roomData, setRoomData, closeModal, rooms = [], api }) => {
    const [submitting, setSubmitting] = useState(false);

    // axios con baseURL (o el que te pasan desde el padre)
    const http = api ?? axios.create({ baseURL: BASE_URL });

    // --- single-file styles injection ---
    useEffect(() => {
        const css = `
      :root{
        --bg: #0b0f1a;
        --card: rgba(255,255,255,0.06);
        --card-border: rgba(255,255,255,0.12);
        --text: #e8ecf1;
        --muted: #9aa7b2;
        --primary: #5cc8ff;
        --primary-600: #2bb7ff;
        --ring: rgba(92,200,255,0.45);
        --success: #16c784;
        --warning: #f5a524;
        --danger: #ef4444;
        --shadow: 0 10px 30px rgba(0,0,0,0.35);
      }
      .room-form-card{ 
        background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid var(--card-border);
        box-shadow: var(--shadow);
        color: var(--text);
        border-radius: 18px;
        padding: 20px;
        max-width: 720px;
        margin: 8px auto;
      }
      .room-form-header{ display:flex; align-items:center; gap:12px; margin-bottom: 14px; }
      .room-form-dot{ width:10px; height:10px; border-radius:999px; background: var(--primary); box-shadow: 0 0 18px var(--ring); }
      .room-form-title{ font-size: 1.15rem; font-weight: 700; letter-spacing: .2px; }
      .room-form-sub{ font-size: .9rem; color: var(--muted); margin-top: -2px; }
      .room-form-grid{ display: grid; grid-template-columns: 1fr; gap: 14px; }
      @media (min-width: 640px){ .room-form-grid{ grid-template-columns: 1fr 1fr; } }
      .room-form-group{ display:flex; flex-direction:column; gap:8px; }
      .room-form-label{ font-size: .85rem; color: var(--muted); }
      .room-input, .room-select {
        background: #0f1626;
        border: 1px solid #1f2a3b;
        color: var(--text);
        border-radius: 12px;
        padding: 12px 14px;
        transition: border-color .2s ease, box-shadow .2s ease, transform .05s ease;
      }
      .room-input::placeholder{ color: #6b7785; }
      .room-input:focus, .room-select:focus{ outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .room-input:disabled, .room-select:disabled{ opacity:.7; cursor:not-allowed; }
      .room-input-group{ display:flex; border-radius: 12px; overflow:hidden; border:1px solid #1f2a3b; background:#0f1626; }
      .room-input-group .addon{ display:flex; align-items:center; padding:0 12px; color:#8ea4b8; border-right:1px solid #1f2a3b; }
      .room-input-group input{ flex:1; border:0; background:transparent; color:var(--text); padding:12px 12px; }
      .room-input-group:focus-within{ border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .help-text{ font-size:.78rem; color:#8ea4b8; margin-top:4px; }
      .status-tip{ font-size:.78rem; margin-top:4px; }
      .status-available{ color: var(--success); }
      .status-occupied{ color: var(--danger); }
      .status-cleaning{ color: var(--warning); }
      .actions{ display:flex; justify-content:flex-end; gap:10px; margin-top: 12px; }
      .btn-modern{
        border-radius: 12px !important; border: 0 !important;
        padding: 10px 16px !important; font-weight: 600 !important;
        background: linear-gradient(90deg, var(--primary), var(--primary-600)) !important;
        color: #05101c !important;
        box-shadow: 0 8px 20px rgba(43,183,255,0.35) !important;
        transform: translateY(0);
        transition: transform .08s ease, filter .15s ease;
      }
      .btn-modern:disabled{ filter: grayscale(.3) brightness(.8); cursor: not-allowed; }
      .btn-modern:hover{ transform: translateY(-1px); }
      .btn-modern:active{ transform: translateY(0); }
      .btn-outline{
        background: transparent !important;
        color: var(--text) !important;
        border: 1px solid #2a3a4f !important;
        box-shadow: none !important;
      }
      .btn-outline:hover{ border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--ring) !important; }
      .sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
    `;
        let style = document.getElementById("roomform-styles");
        if (!style) {
            style = document.createElement("style");
            style.id = "roomform-styles";
            document.head.appendChild(style);
        }
        style.textContent = css;
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // normaliza number a entero positivo en estado (si aplica)
        if (name === "number") {
            const num = value === "" ? "" : Math.max(1, Math.trunc(Number(value)));
            setRoomData((prev) => ({ ...prev, [name]: num }));
            return;
        }
        setRoomData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Normalizaciones finales
        const payload = {
            ...roomData,
            number: Number(roomData.number),
            price: Number(roomData.price),
        };

        // Validación mínima
        if (!payload.number || payload.number < 1) {
            toast.error("El número de habitación debe ser un entero positivo.");
            return;
        }
        if (!payload.type) {
            toast.error("Selecciona el tipo de habitación.");
            return;
        }
        if (payload.price < 0) {
            toast.error("El precio no puede ser negativo.");
            return;
        }

        try {
            setSubmitting(true);

            // ✅ Anti-duplicados en cliente
            const exists = rooms.some(
                (r) => Number(r.number) === Number(payload.number) && r._id !== payload._id
            );
            if (exists) {
                toast.error("Ya existe una habitación con ese número.");
                return;
            }

            if (payload._id) {
                await http.put(`/rooms/${payload._id}`, payload);
                toast.success("Room updated successfully");
            } else {
                await http.post(`/rooms`, payload);
                toast.success("Room created successfully");
            }

            fetchRooms?.();
            setRoomData?.({ number: "", type: "", status: "available", price: "" });
            closeModal?.();
        } catch (error) {
            const status = error?.response?.status;
            const msg =
                status === 409
                    ? "Ya existe una habitación con ese número."
                    : error?.response?.data?.message || "An error occurred. Please try again.";
            toast.error(msg);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Form onSubmit={handleSubmit} aria-describedby="room-form-desc" className="room-form-card" role="form">
            <div className="room-form-header" aria-hidden>
                <span className="room-form-dot" />
                <div>
                    <div className="room-form-title">{roomData?._id ? "Edit Room" : "Create Room"}</div>
                    <div id="room-form-desc" className="room-form-sub">Define number, type, status and price.</div>
                </div>
            </div>

            <div className="room-form-grid">
                {/* Number */}
                <div className="room-form-group">
                    <Label htmlFor="number" className="room-form-label">Room Number</Label>
                    <div className="room-input-group" aria-live="polite">
                        <span className="addon">#</span>
                        <input
                            id="number"
                            name="number"
                            type="number"
                            min={1}
                            placeholder="e.g., 101"
                            className="room-input"
                            value={roomData.number}
                            onChange={handleChange}
                            required
                            aria-required="true"
                        />
                    </div>
                    <div className="help-text">Only positive integers.</div>
                </div>

                {/* Type */}
                <div className="room-form-group">
                    <Label htmlFor="type" className="room-form-label">Room Type</Label>
                    <select
                        id="type"
                        name="type"
                        className="room-select"
                        value={roomData.type}
                        onChange={handleChange}
                        required
                        aria-required="true"
                    >
                        <option value="">Select Type</option>
                        <option value="Simple">Simple</option>
                        <option value="Doble">Doble</option>
                        <option value="Matrimonial">Matrimonial</option>
                        <option value="Suite">Suite</option>
                    </select>
                </div>

                {/* Status */}
                <div className="room-form-group">
                    <Label htmlFor="status" className="room-form-label">Status</Label>
                    <select
                        id="status"
                        name="status"
                        className="room-select"
                        value={roomData.status}
                        onChange={handleChange}
                        required
                    >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                    <span
                        className={`status-tip ${roomData.status === "available"
                                ? "status-available"
                                : roomData.status === "occupied"
                                    ? "status-occupied"
                                    : "status-cleaning"
                            }`}
                    >
                        {roomData.status === "available" && "Ready to book"}
                        {roomData.status === "occupied" && "Currently in use"}
                        {roomData.status === "cleaning" && "Being prepared"}
                        {roomData.status === "maintenance" && "Under maintenance"}
                    </span>
                </div>

                {/* Price */}
                <div className="room-form-group">
                    <Label htmlFor="price" className="room-form-label">Price</Label>
                    <div className="room-input-group">
                        <span className="addon">S/</span>
                        <input
                            id="price"
                            name="price"
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            className="room-input"
                            value={roomData.price}
                            onChange={handleChange}
                            required
                            aria-required="true"
                        />
                    </div>
                    <div className="help-text">Per night. Taxes not included.</div>
                </div>
            </div>

            <div className="actions">
                <Button type="button" className="btn-outline" onClick={closeModal} disabled={submitting}>
                    Cancel
                </Button>
                <Button type="submit" className="btn-modern" disabled={submitting} aria-busy={submitting}>
                    {submitting ? "Saving…" : roomData?._id ? "Update Room" : "Create Room"}
                </Button>
            </div>
        </Form>
    );
};

export default RoomForm;
