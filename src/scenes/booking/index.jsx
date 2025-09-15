// src/scenes/booking/index.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { Button, FormGroup, Input, Label, Form } from "reactstrap";
import { BASE_URL } from "../../utils/config";
import DocumentField from "../../components/ID/DocumentField";
import PaymentFields from "../../components/Payment/PaymentFields";

const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
    "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
    "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the",
    "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
    "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
    "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
    "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North",
    "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
    "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
    "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
    "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
    "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
    "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
    "Solomon Islands", "Somalia", "South Africa", "Spain", "Sri Lanka", "Sudan", "Sudan, South", "Suriname", "Sweden", "Switzerland",
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
    "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const money = (v) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(v || 0));

// helpers val cliente
const isDNI = (v = "") => /^\d{8}$/.test(v);
const isRUC = (v = "") => /^\d{11}$/.test(v);
// ⚠️ Evita escape innecesario del guion: colócalo al inicio del char class
const isCEE = (v = "") => /^[-A-Za-z0-9_]+$/.test(v);
const isPeruPhone9 = (v = "") => /^9\d{8}$/.test(v);

// fechas helpers
const parseISO = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso, days) => {
    const d = parseISO(iso || todayISO());
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

export default function BookingForm() {
    const [rooms, setRooms] = useState([]);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    const [nationality, setNationality] = useState("Peru");
    const [docType, setDocType] = useState([]); // ["DNI","CEE","RUC",...]
    const [idValues, setIdValues] = useState([]); // ["12345678","X1234",...]
    const [userData, setUserData] = useState([]); // [{nombres, apellidos, razonSocial, ...}, ...]

    const [payment, setPayment] = useState({ method: "POS", data: {} });

    // ⬇️ Check-in / out AUTOMÁTICO: hoy y mañana
    const [reservationData, setReservationData] = useState({
        room: "",
        checkInDate: todayISO(),
        checkOutDate: addDaysISO(todayISO(), 1),
    });

    // estilos (igual que tenías)
    useEffect(() => {
        const css = `
      :root{
        --bg:#0b0f1a; --card:rgba(255,255,255,0.06); --card-border:rgba(255,255,255,0.12);
        --text:#e8ecf1; --muted:#9aa7b2; --line:#1f2937; --ring:rgba(92,200,255,0.45);
        --brand:#5cc8ff; --brand-600:#2bb7ff; --success:#16c784; --danger:#ef4444; --warn:#f5a524;
        --shadow:0 10px 30px rgba(0,0,0,.35);
      }
      .booking-shell{ color:var(--text); }
      .booking-card{ background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid var(--card-border);
        border-radius:18px; padding:18px; box-shadow:var(--shadow); max-width:1280px; margin:8px auto; }
      .booking-header{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; }
      .booking-title{ font-weight:800; letter-spacing:.2px; }
      .badge-soft{ display:inline-flex; gap:8px; align-items:center; font-size:.82rem; border:1px solid var(--line);
        padding:6px 10px; border-radius:999px; color:#dbeafe; background:rgba(92,200,255,.12); }
      .quick-nav{ display:flex; flex-wrap:wrap; gap:8px; margin:6px 0 12px; }
      .qchip{ border:1px solid var(--line); padding:6px 10px; border-radius:999px; background:#0b1220; color:#dbeafe; font-weight:700; font-size:.82rem; }
      .qchip:hover{ box-shadow:0 0 0 3px var(--ring); }
      .grid{ display:grid; gap:14px; grid-template-areas: 'left' 'center' 'right'; }
      @media(min-width:900px){ .grid{ grid-template-columns: 1.1fr 1.3fr; grid-template-areas: 'left right' 'center right'; } }
      @media(min-width:1200px){ .grid{ grid-template-columns: 1fr 1.1fr 0.9fr; grid-template-areas: 'left center right'; } }
      .left{ grid-area:left; } .center{ grid-area:center; } .right{ grid-area:right; }
      .section{ border:1px solid var(--line); border-radius:14px; padding:14px; background:#0f1626; }
      .section h5{ margin:0 0 8px 0; font-weight:800; }
      .hint{ font-size:.8rem; color:var(--muted); margin-top:4px; }
      .form-input{ background:#0f1626; border:1px solid #1f2a3b; color:var(--text); border-radius:12px; padding:12px 14px; }
      .form-input:focus{ outline:none; border-color:var(--brand); box-shadow:0 0 0 4px var(--ring); }
      .row-2{ display:grid; grid-template-columns:1fr; gap:12px; }
      @media(min-width:520px){ .row-2{ grid-template-columns:1fr 1fr; } }
      .guest-card{ border:1px solid var(--line); background:#101828; border-radius:12px; padding:12px; margin-bottom:10px; }
      .sticky{ position:sticky; top:12px; display:flex; flex-direction:column; gap:14px; }
      .summary{ border:1px dashed var(--line); border-radius:14px; padding:14px; display:grid; gap:8px; }
      .summary .chip{ display:flex; justify-content:space-between; gap:10px; align-items:center; border:1px solid var(--line); padding:8px 12px; border-radius:12px; background:#0b1220; }
      .summary .total{ font-weight:900; font-size:1.1rem; }
      .actions{ display:flex; gap:10px; justify-content:flex-end; }
      .btn-modern{ border-radius:12px !important; border:0 !important; padding:10px 16px !important; font-weight:700 !important;
        background:linear-gradient(90deg, var(--brand), var(--brand-600)) !important; color:#05101c !important; box-shadow:0 8px 20px rgba(43,183,255,.35) !important; }
      .btn-modern:disabled{ filter:grayscale(.3) brightness(.8); cursor:not-allowed; }
      .empty{ text-align:center; border:1px dashed var(--line); border-radius:12px; padding:16px; color:var(--muted); }
    `;
        let style = document.getElementById("bookingform-3col-styles");
        if (!style) {
            style = document.createElement("style");
            style.id = "bookingform-3col-styles";
            document.head.appendChild(style);
        }
        style.textContent = css;
    }, []);

    // rooms
    const fetchRooms = async () => {
        try {
            setLoadingRooms(true);
            const { data } = await axios.get(`${BASE_URL}/rooms`, { withCredentials: true });
            // 🔒 Normaliza _id a string para evitar comparaciones ObjectId vs string
            const normalized = (data || []).map((r) => ({ ...r, _id: String(r._id) }));
            const available = normalized.filter((room) => room.status === "available");
            setRooms(normalized || []);
            setAvailableRooms(available);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            toast.error("Error fetching rooms");
        } finally {
            setLoadingRooms(false);
        }
    };
    useEffect(() => {
        fetchRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // noches (solo display)
    const nights = useMemo(() => {
        const ci = parseISO(reservationData.checkInDate);
        const co = parseISO(reservationData.checkOutDate);
        if (!ci || !co) return 0;
        const diff = Math.round((co - ci) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }, [reservationData.checkInDate, reservationData.checkOutDate]);

    const selectedRoom = useMemo(
        () =>
            availableRooms.find((r) => String(r._id) === String(reservationData.room)) ||
            rooms.find((r) => String(r._id) === String(reservationData.room)),
        [availableRooms, rooms, reservationData.room]);

    const total = useMemo(
        () => (selectedRoom?.price ? Number(selectedRoom.price) * nights : 0),
        [selectedRoom, nights]
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setReservationData((prev) => ({ ...prev, [name]: value }));
    };

    const capacityByType = (type = "") => {
        switch (type) {
            case "Matrimonial":
            case "Doble":
            case "Suite":
                return 2;
            case "Simple":
            default:
                return 1;
        }
    };

    const handleRoomChange = (e) => {
        const roomId = e.target.value; // string
        const selected = rooms.find((room) => String(room._id) === roomId);
        const cap = capacityByType(selected?.type);

        setReservationData((prev) => ({
            ...prev,
            room: selected ? String(selected._id) : "",
            // Si por alguna razón las fechas vienen vacías, re-autocompleta
            checkInDate: prev.checkInDate || todayISO(),
            checkOutDate: prev.checkOutDate || addDaysISO(todayISO(), 1),
        }));

        // inicializa arrays por capacidad
        setUserData(
            Array.from({ length: cap }, () => ({
                nombres: "",
                apellidoPaterno: "",
                apellidoMaterno: "",
                razonSocial: "",
                direccion: "",
                nationality,
            }))
        );
        setDocType(Array.from({ length: cap }, () => (nationality === "Peru" ? "DNI" : "CEE")));
        setIdValues(Array.from({ length: cap }, () => ""));
    };

    const handleNationalityChange = (e) => {
        const value = e.target.value;
        setNationality(value);

        // Ajusta docType para todos los slots (mantiene RUC si ya estaba)
        setDocType((prev) =>
            prev.map((dt) => {
                if (dt === "RUC") return "RUC";
                return value === "Peru" ? "DNI" : "CEE";
            })
        );

        setUserData((prev) => prev.map((u) => ({ ...u, nationality: value })));
    };

    // -------- Validaciones (memorizadas) --------
    const validateGuests = useCallback(() => {
        if (!userData.length) return "Falta al menos un huésped.";
        for (let i = 0; i < userData.length; i++) {
            const t = docType[i] || (nationality === "Peru" ? "DNI" : "CEE");
            const num = (idValues[i] || "").trim();
            if (!t || !num) return `Huésped ${i + 1}: tipo y número de documento son obligatorios.`;
            if (t === "DNI" && !isDNI(num)) return `Huésped ${i + 1}: DNI inválido (8 dígitos).`;
            if (t === "CEE" && !isCEE(num)) return `Huésped ${i + 1}: CEE inválido.`;
            if (t === "RUC") {
                if (!isRUC(num)) return `Huésped ${i + 1}: RUC inválido (11 dígitos).`;
                if (!userData[i]?.razonSocial?.trim())
                    return `Huésped ${i + 1}: razón social obligatoria para RUC.`;
                if (!userData[i]?.direccion?.trim())
                    return `Huésped ${i + 1}: dirección obligatoria para RUC.`;
            }
        }
        return null;
    }, [userData, docType, nationality, idValues]);

    const validatePaymentClient = useCallback(() => {
        const m = payment?.method;
        if (!m) return "Elige método de pago.";
        const d = payment?.data || {};
        if (m === "POS" && !d.voucher) return "Falta voucher POS.";
        if (m === "PagoEfectivo" && !d.cip) return "Falta CIP de PagoEfectivo.";
        if (m === "Yape" && !d.phone) return "Falta teléfono de Yape.";
        if (m === "Yape" && d.phone && !isPeruPhone9(d.phone))
            return "Teléfono Yape inválido (9 dígitos, inicia con 9).";
        if (m === "Credito" && !d.plazoDias) return "Falta plazo de crédito (días).";
        return null;
    }, [payment]);

    const [submitting, setSubmitting] = useState(false);

    const isFormReady = useMemo(() => {
        if (!reservationData.room) return false;
        if (!reservationData.checkInDate || !reservationData.checkOutDate) return false; // autocompletadas
        if (nights <= 0) return false;
        if (validateGuests()) return false;
        if (validatePaymentClient()) return false;
        return true;
    }, [
        reservationData.room,
        reservationData.checkInDate,
        reservationData.checkOutDate,
        nights,
        validateGuests,
        validatePaymentClient,
    ]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormReady) {
            const gErr = validateGuests();
            if (gErr) return toast.error(gErr);
            const pErr = validatePaymentClient();
            if (pErr) return toast.error(pErr);
            return toast.error("Completa los campos requeridos.");
        }
        try {
            setSubmitting(true);

            const payload = {
                room: String(reservationData.room),
                checkInDate: reservationData.checkInDate, // YYYY-MM-DD
                checkOutDate: reservationData.checkOutDate, // YYYY-MM-DD
                userData: userData.map((g, i) => ({
                    ...g,
                    nombres: g.nombres?.trim() || undefined,
                    apellidoPaterno: g.apellidoPaterno?.trim() || undefined,
                    apellidoMaterno: g.apellidoMaterno?.trim() || undefined,
                    razonSocial: g.razonSocial?.trim() || undefined,
                    direccion: g.direccion?.trim() || undefined,
                    docType: String(docType[i] || "").toUpperCase(),
                    docNumber: String(idValues[i] || "").trim(),
                    nationality: g.nationality || nationality || "Peru",
                })),
                nationality,
                payment: { method: payment.method, data: payment.data },
            };

            const res = await axios.post(`${BASE_URL}/reservations`, payload, {
                withCredentials: true,
            });
            if (res.status === 201) {
                toast.success("Reservación creada con éxito");
                fetchRooms();
                resetForm();
            } else {
                toast.error("Error al crear la reservación");
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error al crear la reservación:", error);
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Error al crear la reservación";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setReservationData({
            room: "",
            checkInDate: todayISO(),
            checkOutDate: addDaysISO(todayISO(), 1),
        });
        setNationality("Peru");
        setUserData([]);
        setDocType([]);
        setIdValues([]);
        setPayment({ method: "POS", data: {} });
    };

    const minCheckIn = todayISO();
    const minCheckOut = reservationData.checkInDate
        ? addDaysISO(reservationData.checkInDate, 1)
        : addDaysISO(minCheckIn, 1);

    return (
        <Form
            onSubmit={handleSubmit}
            className="booking-shell booking-card"
            role="form"
            aria-describedby="booking-desc"
        >
            <div className="booking-header">
                <div>
                    <div className="booking-title">Nueva Reservación</div>
                    <div id="booking-desc" className="hint">
                        Elige habitación y fechas, registra huéspedes y procesa el pago.
                    </div>
                </div>
                <span className="badge-soft">
                    {loadingRooms ? "Cargando habitaciones…" : `${availableRooms.length} disponibles`}
                </span>
            </div>

            <nav className="quick-nav" aria-label="Secciones">
                <a href="#sec-room" className="qchip">
                    Habitación y fechas
                </a>
                <a href="#sec-guests" className="qchip">
                    Huéspedes
                </a>
                <a href="#sec-payment" className="qchip">
                    Pago y resumen
                </a>
            </nav>

            <div className="grid">
                {/* LEFT */}
                <div className="left">
                    <div id="sec-room" className="section">
                        <h5>Habitación y Fechas</h5>
                        <FormGroup>
                            <Label htmlFor="room">Habitación</Label>
                            <Input
                                id="room"
                                type="select"
                                name="room"
                                onChange={handleRoomChange}
                                className="form-input"
                                value={reservationData.room}
                                required
                            >
                                <option value="">Selecciona una habitación</option>
                                {availableRooms.map((room) => (
                                    <option key={String(room._id)} value={String(room._id)}>
                                        #{room.number} — {room.type}
                                    </option>
                                ))}
                            </Input>
                            <div className="hint">Solo se listan habitaciones disponibles.</div>
                        </FormGroup>

                        {/* Fechas AUTOCOMPLETADAS */}
                        <div className="row-2">
                            <FormGroup>
                                <Label htmlFor="checkInDate">Check-In</Label>
                                <Input
                                    id="checkInDate"
                                    type="date"
                                    name="checkInDate"
                                    min={minCheckIn}
                                    value={reservationData.checkInDate}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                                <div className="hint">Se autocompleta a hoy (Lima).</div>
                            </FormGroup>
                            <FormGroup>
                                <Label htmlFor="checkOutDate">Check-Out</Label>
                                <Input
                                    id="checkOutDate"
                                    type="date"
                                    name="checkOutDate"
                                    min={minCheckOut}
                                    value={reservationData.checkOutDate}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                                <div className="hint">Se autocompleta a mañana (mín. 1 noche).</div>
                            </FormGroup>
                        </div>

                        <FormGroup>
                            <Label htmlFor="nationality">Nacionalidad</Label>
                            <Input
                                id="nationality"
                                type="select"
                                name="nationality"
                                onChange={handleNationalityChange}
                                className="form-input"
                                value={nationality}
                            >
                                {countries.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </Input>
                        </FormGroup>
                    </div>
                </div>

                {/* CENTER */}
                <div className="center">
                    <div id="sec-guests" className="section">
                        <h5>Huéspedes</h5>
                        {!userData.length && (
                            <div className="hint">
                                Selecciona una habitación para generar los campos de huéspedes.
                            </div>
                        )}
                        {userData.map((guest, index) => (
                            <div key={index} className="guest-card">
                                <h6 style={{ margin: 0, fontWeight: 800 }}>
                                    {(docType[index] || (nationality === "Peru" ? "DNI" : "CEE")) === "RUC"
                                        ? "Empresa"
                                        : "Huésped"}{" "}
                                    {index + 1}
                                </h6>
                                <DocumentField
                                    index={index}
                                    docType={docType}
                                    setDocType={setDocType}
                                    idValues={idValues}
                                    setIdValues={setIdValues}
                                    userData={userData}
                                    setUserData={setUserData}
                                    nationality={nationality}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT */}
                <div className="right">
                    <div className="sticky">
                        <div className="section">
                            <h5>Resumen</h5>
                            <div className="summary" aria-live="polite">
                                <div className="chip">
                                    <span>Habitación</span>
                                    <strong>
                                        {selectedRoom ? `#${selectedRoom.number} — ${selectedRoom.type}` : "—"}
                                    </strong>
                                </div>
                                <div className="chip">
                                    <span>Noches</span>
                                    <strong>{nights}</strong>
                                </div>
                                <div className="chip">
                                    <span>Tarifa</span>
                                    <strong>{selectedRoom?.price ? money(selectedRoom.price) : "—"}</strong>
                                </div>
                                <div className="chip total">
                                    <span>Total</span>
                                    <strong>{money(total)}</strong>
                                </div>
                                <div className="hint">El total varía según noches y tarifa actual.</div>
                            </div>
                        </div>

                        <div id="sec-payment" className="section">
                            <h5>Pago</h5>
                            <FormGroup>
                                <Label htmlFor="payment-method">Método</Label>
                                <Input
                                    id="payment-method"
                                    type="select"
                                    value={payment.method}
                                    onChange={(e) => setPayment({ method: e.target.value, data: {} })}
                                    className="form-input"
                                >
                                    <option value="POS">POS</option>
                                    <option value="PagoEfectivo">PagoEfectivo</option>
                                    <option value="Yape">Yape</option>
                                    <option value="Credito">Crédito</option>
                                </Input>
                            </FormGroup>
                            <PaymentFields payment={payment} setPayment={setPayment} />
                            <div className="actions" style={{ marginTop: 12 }}>
                                <Button
                                    type="submit"
                                    className="btn-modern"
                                    disabled={submitting || !isFormReady}
                                    aria-busy={submitting}
                                >
                                    {submitting ? "Reservando…" : "Reservar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!loadingRooms && availableRooms.length === 0 && (
                <div className="empty" role="status" style={{ marginTop: 14 }}>
                    No hay habitaciones disponibles por ahora.
                </div>
            )}
        </Form>
    );
}
