// src/components/Reservations/ExtendStayModal.jsx
import React, { useMemo, useState } from "react";
import { Button, FormGroup, Label, Input } from "reactstrap";
import axios from "axios";
import { toast } from "react-toastify";
import CustomModal from "../Modal/Modal";
import { BASE_URL } from "../../utils/config";

/* MUI para selects oscuros */
import { FormControl, InputLabel, Select as MUISelect, MenuItem } from "@mui/material";

const nightsBetween = (from, to) => {
    if (!from || !to) return 0;
    const A = new Date(from); A.setHours(12, 0, 0, 0);
    const B = new Date(to); B.setHours(12, 0, 0, 0);
    return Math.ceil((B - A) / (1000 * 60 * 60 * 24));
};

const ExtendStayModal = ({ isOpen, toggle, reservation, onExtended }) => {
    // Hooks SIEMPRE al tope y sin condicionales
    const [newOut, setNewOut] = useState("");
    const [method, setMethod] = useState(""); // "" = no cobrar ahora
    const [payData, setPayData] = useState({});
    const [rateOverride, setRateOverride] = useState("");
    const [loading, setLoading] = useState(false);

    // Usa valores seguros (pueden ser undefined)
    const resCheckOut = reservation?.checkOutDate ?? null;

    const currentOutISO = useMemo(() => {
        if (!resCheckOut) return "";
        const d = new Date(resCheckOut);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }, [resCheckOut]);

    const nightsAdded = useMemo(() => {
        if (!newOut || !currentOutISO) return 0;
        return Math.max(0, nightsBetween(currentOutISO, newOut));
    }, [currentOutISO, newOut]);

    const validatePaymentFront = () => {
        if (!method) return null;
        if (method === "POS" && !payData?.voucher) return "Falta voucher POS";
        if (method === "PagoEfectivo" && !payData?.cip) return "Falta CIP de PagoEfectivo";
        if (method === "Yape" && !payData?.phone) return "Falta teléfono de Yape";
        if (method === "Credito" && !payData?.plazoDias) return "Falta plazo de crédito (días)";
        return null;
    };

    const handleSubmit = async () => {
        if (!reservation?._id) return toast.error("No hay reservación seleccionada");
        if (!newOut) return toast.error("Elige la nueva fecha de check-out");
        if (currentOutISO && new Date(newOut) <= new Date(currentOutISO)) {
            return toast.error("La nueva fecha debe ser posterior al check-out actual");
        }
        const err = validatePaymentFront();
        if (err) return toast.error(err);

        try {
            setLoading(true);
            const body = {
                newCheckOutDate: newOut,
                rateOverride: rateOverride ? Number(rateOverride) : undefined,
                payment: method ? { method, data: payData } : undefined,
            };
            const { data } = await axios.patch(`${BASE_URL}/reservations/${reservation._id}/extend`, body, { withCredentials: true });
            toast.success("Estadía extendida ✅");
            onExtended?.(data);
            toggle();
        } catch (e) {
            const msg = e?.response?.data?.error || e?.response?.data?.message || "No se pudo extender";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <CustomModal isOpen={isOpen} toggle={toggle} title="Extender estadía">
            {!reservation ? (
                <p>Selecciona una reservación para extender.</p>
            ) : (
                <>
                    <FormGroup>
                        <Label>Check-Out actual</Label>
                        <Input readOnly disabled value={currentOutISO} />
                    </FormGroup>

                    <FormGroup>
                        <Label>Nuevo Check-Out</Label>
                        <Input type="date" value={newOut} onChange={(e) => setNewOut(e.target.value)} />
                    </FormGroup>

                    <FormGroup>
                        <Label>Noches adicionales</Label>
                        <Input readOnly disabled value={nightsAdded} />
                    </FormGroup>

                    <FormGroup>
                        <Label>Tarifa por noche (override) — opcional</Label>
                        <Input
                            type="number"
                            min={0}
                            placeholder="Dejar vacío para usar la tarifa del cuarto"
                            value={rateOverride}
                            onChange={(e) => setRateOverride(e.target.value)}
                        />
                    </FormGroup>

                    <hr />

                    {/* ===== Select MUI: Cobrar ahora ===== */}
                    <FormControl variant="filled" fullWidth sx={{ mb: 3 }}>
                        <InputLabel id="pay-now-label">Cobrar ahora (opcional)</InputLabel>
                        <MUISelect
                            labelId="pay-now-label"
                            value={method}
                            onChange={(e) => {
                                setMethod(e.target.value);
                                setPayData({});
                            }}
                            MenuProps={{ PaperProps: { className: "cm-menu" } }} // 👈 popup oscuro
                        >
                            <MenuItem value="">No cobrar ahora</MenuItem>
                            <MenuItem value="POS">POS</MenuItem>
                            <MenuItem value="PagoEfectivo">PagoEfectivo</MenuItem>
                            <MenuItem value="Yape">Yape</MenuItem>
                            <MenuItem value="Credito">Crédito</MenuItem>
                        </MUISelect>
                    </FormControl>

                    {method === "POS" && (
                        <FormGroup>
                            <Label>N° voucher POS</Label>
                            <Input onChange={(e) => setPayData((p) => ({ ...p, voucher: e.target.value }))} />
                        </FormGroup>
                    )}

                    {method === "PagoEfectivo" && (
                        <>
                            <FormGroup>
                                <Label>CIP</Label>
                                <Input onChange={(e) => setPayData((p) => ({ ...p, cip: e.target.value }))} />
                            </FormGroup>

                            {/* Estado con MUI Select (para evitar menú blanco) */}
                            <FormControl variant="filled" fullWidth sx={{ mb: 3 }}>
                                <InputLabel id="pe-status-label">Estado</InputLabel>
                                <MUISelect
                                    labelId="pe-status-label"
                                    value={payData?.status || "pendiente"}
                                    onChange={(e) => setPayData((p) => ({ ...p, status: e.target.value }))}
                                    MenuProps={{ PaperProps: { className: "cm-menu" } }}
                                >
                                    <MenuItem value="pendiente">Pendiente</MenuItem>
                                    <MenuItem value="pagado">Pagado</MenuItem>
                                    <MenuItem value="expirado">Expirado</MenuItem>
                                </MUISelect>
                            </FormControl>
                        </>
                    )}

                    {method === "Yape" && (
                        <>
                            <FormGroup>
                                <Label>Teléfono Yape</Label>
                                <Input onChange={(e) => setPayData((p) => ({ ...p, phone: e.target.value }))} />
                            </FormGroup>
                            <FormGroup>
                                <Label>Referencia</Label>
                                <Input onChange={(e) => setPayData((p) => ({ ...p, reference: e.target.value }))} />
                            </FormGroup>
                        </>
                    )}

                    {method === "Credito" && (
                        <>
                            <FormGroup>
                                <Label>Plazo de crédito (días)</Label>
                                <Input type="number" min={1} onChange={(e) => setPayData((p) => ({ ...p, plazoDias: e.target.value }))} />
                            </FormGroup>
                            <FormGroup>
                                <Label>Fecha de vencimiento (opcional)</Label>
                                <Input type="date" onChange={(e) => setPayData((p) => ({ ...p, vence: e.target.value }))} />
                            </FormGroup>
                            <FormGroup>
                                <Label>Referencia (opcional)</Label>
                                <Input onChange={(e) => setPayData((p) => ({ ...p, referencia: e.target.value }))} />
                            </FormGroup>
                        </>
                    )}

                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <Button color="secondary" onClick={toggle} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button color="primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Guardando..." : "Guardar"}
                        </Button>
                    </div>
                </>
            )}
        </CustomModal>
    );
};

export default ExtendStayModal;
