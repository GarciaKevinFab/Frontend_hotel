import React, { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPenToSquare,
    faTrash,
    faBed,
    faBroom,
    faBedPulse,
    faMoneyBillWave,
    faCircleCheck,
    faScrewdriverWrench,
    faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

/**
 * Props:
 *   rooms: Array<{ _id, number, type, status, price }>
 *   handleEdit(id)
 *   handleDelete(id)
 *   onQuickToggle(id)   // 👈 NUEVO: doble clic cleaning -> available
 */

const money = (v) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 2,
    }).format(Number(v || 0));

const META = {
    available: { label: "Disponible", icon: faCircleCheck, cls: "available" },
    occupied: { label: "Ocupada", icon: faBedPulse, cls: "occupied" },
    cleaning: { label: "Limpieza", icon: faBroom, cls: "cleaning" },
    maintenance: { label: "Mantenimiento", icon: faScrewdriverWrench, cls: "maintenance" },
};

const BEDS_BY_TYPE = { Simple: 1, Doble: 2, Matrimonial: 1, Suite: 1 };

const BedRow = ({ n = 1 }) => (
    <div className="bed-row" aria-label={`Camas: ${n}`}>
        {Array.from({ length: Math.max(1, n) }).map((_, i) => (
            <FontAwesomeIcon key={i} icon={faBed} className="bed-icon" />
        ))}
    </div>
);

export default function RoomList({ rooms = [], handleEdit, handleDelete, onQuickToggle }) {
    // --- single-file styles injection ---
    useEffect(() => {
        const css = `
      :root {
        --card: #0f172a;
        --card-2: #0b1324;
        --ink: #e5e7eb;
        --muted: #94a3b8;
        --line: #1f2937;
        --brand: #6366f1;
        --success: #16a34a;
        --danger: #ef4444;
        --warn: #f59e0b;
        --maint: #06b6d4;
        --soft: #111827;
        --shadow-1: 0 6px 18px rgba(2, 6, 23, .35);
        --shadow-2: 0 10px 28px rgba(2, 6, 23, .45);
        --fs-sm: 0.9rem;
        --fs-xl: 1.35rem;
        --sp-3: 16px;
        --sp-4: 20px;
      }
      .room-list { padding: var(--sp-3); }
      .room-list-title { font-size: var(--fs-xl); font-weight: 800; text-align: center; margin: 0 0 var(--sp-4) 0; letter-spacing: -0.01em; color: var(--ink); }

      .legend { display:flex; gap:10px; justify-content:center; align-items:center; margin:-10px 0 var(--sp-3); flex-wrap: wrap; }
      .legend .chip { opacity:.9; }

      .room-list-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--sp-4); }

      .room-card { position: relative; border: 1px solid var(--line); background: linear-gradient(180deg, var(--card-2), var(--card)); color: var(--ink); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow-1); display: grid; grid-template-rows: auto 1fr auto; transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease; }
      .room-card:hover { transform: translateY(-2px); border-color: color-mix(in oklab, var(--brand) 40%, var(--line)); box-shadow: var(--shadow-2); }
      .room-card.st-cleaning { cursor: pointer; }  /* 👈 se nota clickable cuando está cleaning */

      .room-hero { position: absolute; right: -8px; bottom: -10px; font-size: 120px; line-height: 1; color: color-mix(in oklab, var(--brand) 18%, transparent); opacity: .10; pointer-events: none; }

      .room-card-hdr { --tint: var(--brand); padding: 12px 14px; border-bottom: 1px solid var(--line); background: linear-gradient(120deg, color-mix(in oklab, var(--tint) 28%, transparent) 0%, transparent 80%); display:flex; justify-content: space-between; align-items: center; }

      .room-card.st-available .room-card-hdr { --tint: var(--success); }
      .room-card.st-occupied .room-card-hdr { --tint: var(--danger); }
      .room-card.st-cleaning .room-card-hdr { --tint: var(--warn); }
      .room-card.st-maintenance .room-card-hdr { --tint: var(--maint); }

      .chip { display: inline-flex; align-items: center; gap: 8px; height: 28px; padding: 0 12px; border-radius: 999px; font-size: var(--fs-sm); font-weight: 800; border: 1px solid var(--line); letter-spacing: .01em; }
      .chip.status { background: color-mix(in oklab, var(--tint) 16%, #0b1220); color: #dbeafe; border-color: color-mix(in oklab, var(--tint) 50%, var(--line)); }
      .chip.price { margin-top: 8px; background: color-mix(in oklab, var(--brand) 10%, var(--soft)); color: #e2e8f0; border-color: color-mix(in oklab, var(--brand) 40%, var(--line)); }

      .room-card-body { display: grid; place-items: center; gap: 8px; padding: 18px; text-align: center; }
      .room-number { font-size: clamp(20px, 2.2vw, 28px); font-weight: 900; letter-spacing: .02em; }
      .room-type { font-size: var(--fs-sm); color: var(--muted); }

      .bed-row { display: inline-flex; gap: 6px; margin-top: 2px; }
      .bed-icon { font-size: 18px; color: #cbd5e1; opacity: .95; }

      .room-actions { display: flex; gap: 12px; justify-content: center; padding: 12px 14px 16px; }

      .icon-btn { border: 0; border-radius: 12px; padding: 10px 14px; font-size: 16px; cursor: pointer; background: #0b1220; color: #e5e7eb; transition: transform .06s, box-shadow .2s, background .2s, color .2s; box-shadow: 0 1px 1px rgba(2, 6, 23, .06); }
      .icon-btn:hover { transform: translateY(-1px); }
      .icon-btn:active { transform: translateY(0); }
      .icon-btn:focus-visible, .chip:focus-visible { outline: none; box-shadow: 0 0 0 4px color-mix(in oklab, var(--brand) 36%, transparent); }

      .icon-btn.edit { background: color-mix(in oklab, var(--brand) 22%, #0b1220); border: 1px solid color-mix(in oklab, var(--brand) 60%, var(--line)); }
      .icon-btn.edit:hover { box-shadow: 0 0 0 6px color-mix(in oklab, var(--brand) 28%, transparent); background: color-mix(in oklab, var(--brand) 32%, #101a33); }

      .icon-btn.danger { background: color-mix(in oklab, var(--danger) 18%, #0b1220); border: 1px solid color-mix(in oklab, var(--danger) 60%, var(--line)); color: #fee2e2; }
      .icon-btn.danger:hover { box-shadow: 0 0 0 6px color-mix(in oklab, var(--danger) 26%, transparent); background: color-mix(in oklab, var(--danger) 28%, #1a0f12); }

      .empty-state { border: 1px dashed var(--line); border-radius: 16px; padding: 28px; display:grid; place-items:center; text-align:center; color: var(--muted); background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); }
      .empty-title { font-weight: 800; color: var(--ink); margin-top: 8px; }
      .empty-sub { max-width: 520px; margin: 6px auto 0; }
    `;
        let style = document.getElementById("roomlist-styles");
        if (!style) {
            style = document.createElement("style");
            style.id = "roomlist-styles";
            document.head.appendChild(style);
        }
        style.textContent = css;
    }, []);

    return (
        <section className="room-list" aria-labelledby="rooms-title">
            <h2 id="rooms-title" className="room-list-title">Rooms</h2>

            <div className="legend" aria-hidden>
                <span className="chip" style={{ ['--tint']: '#16a34a' }}>
                    <FontAwesomeIcon icon={faCircleCheck} /> Disponible
                </span>
                <span className="chip" style={{ ['--tint']: '#ef4444' }}>
                    <FontAwesomeIcon icon={faBedPulse} /> Ocupada
                </span>
                <span className="chip" style={{ ['--tint']: '#f59e0b' }}>
                    <FontAwesomeIcon icon={faBroom} /> Limpieza
                </span>
                <span className="chip" style={{ ['--tint']: '#06b6d4' }}>
                    <FontAwesomeIcon icon={faScrewdriverWrench} /> Mantenimiento
                </span>
            </div>

            {(!rooms || rooms.length === 0) ? (
                <div className="empty-state" role="status" aria-live="polite">
                    <FontAwesomeIcon icon={faCircleInfo} size="2x" />
                    <div className="empty-title">No hay habitaciones para mostrar</div>
                    <p className="empty-sub">Agrega una nueva habitación desde el panel. Aquí verás el estado, tipo, camas y la tarifa por noche.</p>
                </div>
            ) : (
                <div className="room-list-container">
                    {rooms.map((room) => {
                        const meta = META[room.status] || META.available;
                        const beds = BEDS_BY_TYPE[room.type] ?? 1;
                        const canToggle = room.status === "cleaning";

                        return (
                            <article
                                key={room._id}
                                className={`room-card st-${meta.cls}`}
                                aria-label={`Habitación ${room.number}, ${meta.label}`}
                                onDoubleClick={() => canToggle && onQuickToggle?.(room._id)}
                                title={
                                    canToggle
                                        ? "Doble clic para marcar como disponible"
                                        : " "
                                }
                            >
                                <div className="room-hero" aria-hidden="true">
                                    <FontAwesomeIcon icon={faBed} />
                                </div>

                                <header className="room-card-hdr">
                                    <span className="chip status" aria-label={`Estado: ${meta.label}`}>
                                        <FontAwesomeIcon icon={meta.icon} />
                                        {meta.label}
                                    </span>
                                </header>

                                <div className="room-card-body">
                                    <div className="room-number">#{room.number}</div>
                                    <div className="room-type">{room.type || "—"}</div>

                                    <BedRow n={beds} />

                                    <div className="chip price" aria-label={`Tarifa: ${room.price ? money(room.price) : 'Sin tarifa'}`}>
                                        <FontAwesomeIcon icon={faMoneyBillWave} />
                                        {room.price ? money(room.price) : "Sin tarifa"}
                                    </div>
                                </div>

                                <footer className="room-actions">
                                    <button
                                        className="icon-btn edit"
                                        title="Editar"
                                        aria-label={`Editar habitación ${room.number}`}
                                        onClick={() => handleEdit(room._id)}
                                    >
                                        <FontAwesomeIcon icon={faPenToSquare} />
                                    </button>

                                    <button
                                        className="icon-btn danger"
                                        title="Eliminar"
                                        aria-label={`Eliminar habitación ${room.number}`}
                                        onClick={() => handleDelete(room._id)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </footer>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
