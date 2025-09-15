import React, { useEffect } from 'react';
import { FormGroup, Label, Input } from 'reactstrap';

/**
 * PaymentFields (mejorado)
 * - Misma estética glass/dark que los otros formularios
 * - Ayudas contextuales y validaciones suaves (pattern, min, etc.)
 * - Auto-inyección de estilos (no requiere PaymentFields.css)
 * - API intacta: { payment, setPayment }
 */

const setData = (setPayment, patch) =>
    setPayment((p) => ({ ...p, data: { ...(p?.data || {}), ...patch } }));

const todayISO = () => new Date().toISOString().slice(0, 10);

const PaymentFields = ({ payment, setPayment }) => {
    const m = payment?.method || 'POS';

    // estilos single-file
    useEffect(() => {
        const css = `
      :root{ --line:#1f2a3b; --text:#e8ecf1; --muted:#9aa7b2; --ring:rgba(92,200,255,.45); --brand:#5cc8ff; }
      .payment-section{ position:relative; color:var(--text); }
      .pf-input{ background:#0f1626 !important; border:1px solid var(--line) !important; color:var(--text) !important; border-radius:12px !important; padding:12px 14px !important; }
      .pf-input:focus{ outline:none; border-color:var(--brand) !important; box-shadow:0 0 0 4px var(--ring) !important; }
      .pf-hint{ font-size:.82rem; color:var(--muted); margin-top:4px; }
      .pf-row{ display:grid; grid-template-columns:1fr; gap:12px; }
      @media(min-width:680px){ .pf-row{ grid-template-columns:1fr 1fr; } }
    `;
        let style = document.getElementById('paymentfields-styles');
        if (!style) { style = document.createElement('style'); style.id = 'paymentfields-styles'; document.head.appendChild(style); }
        style.textContent = css;
    }, []);

    if (m === 'PagoEfectivo') {
        return (
            <div className="payment-section">
                <FormGroup>
                    <Label htmlFor="pay-cip">CIP (PagoEfectivo)</Label>
                    <Input
                        id="pay-cip"
                        className="pf-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6,20}"
                        placeholder="Solo dígitos (6–20)"
                        value={payment?.data?.cip ?? ''}
                        onChange={(e) => setData(setPayment, { cip: e.target.value.replace(/\D+/g, '') })}
                    />
                    <div className="pf-hint">Ingresa el CIP exacto entregado por PagoEfectivo.</div>
                </FormGroup>
                <FormGroup>
                    <Label htmlFor="pay-status">Estado</Label>
                    <Input
                        id="pay-status"
                        className="pf-input"
                        type="select"
                        value={payment?.data?.status ?? 'pendiente'}
                        onChange={(e) => setData(setPayment, { status: e.target.value })}
                    >
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                        <option value="expirado">Expirado</option>
                    </Input>
                </FormGroup>
            </div>
        );
    }

    if (m === 'Yape') {
        return (
            <div className="payment-section">
                <FormGroup>
                    <Label htmlFor="pay-phone">Teléfono Yape</Label>
                    <Input
                        id="pay-phone"
                        className="pf-input"
                        type="tel"
                        inputMode="numeric"
                        pattern="9[0-9]{8}"
                        maxLength={9}
                        placeholder="9XXXXXXXX"
                        value={payment?.data?.phone ?? ''}
                        onChange={(e) => setData(setPayment, { phone: e.target.value.replace(/\D+/g, '').slice(0, 9) })}
                    />
                    <div className="pf-hint">Número móvil peruano de 9 dígitos que inicia en 9.</div>
                </FormGroup>
                <FormGroup>
                    <Label htmlFor="pay-ref">Código/Referencia</Label>
                    <Input
                        id="pay-ref"
                        className="pf-input"
                        type="text"
                        autoComplete="off"
                        placeholder="p.ej., 123ABC"
                        value={payment?.data?.reference ?? ''}
                        onChange={(e) => setData(setPayment, { reference: e.target.value })}
                    />
                    <div className="pf-hint">Referencia del pago (opcional pero recomendable).</div>
                </FormGroup>
            </div>
        );
    }

    if (m === 'Credito') {
        const minDue = todayISO();
        return (
            <div className="payment-section">
                <div className="pf-row">
                    <FormGroup>
                        <Label htmlFor="pay-plazo">Plazo de crédito (días)</Label>
                        <Input
                            id="pay-plazo"
                            className="pf-input"
                            type="number"
                            min={1}
                            step={1}
                            placeholder="p.ej., 30"
                            value={payment?.data?.plazoDias ?? ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setData(setPayment, { plazoDias: val });
                            }}
                        />
                        <div className="pf-hint">Requerido para facturación a crédito.</div>
                    </FormGroup>
                    <FormGroup>
                        <Label htmlFor="pay-vence">Fecha de vencimiento (opcional)</Label>
                        <Input
                            id="pay-vence"
                            className="pf-input"
                            type="date"
                            min={minDue}
                            value={payment?.data?.vence ?? ''}
                            onChange={(e) => setData(setPayment, { vence: e.target.value })}
                        />
                        <div className="pf-hint">Si no la defines, se calcula en back-office según el plazo.</div>
                    </FormGroup>
                </div>
                <FormGroup>
                    <Label htmlFor="pay-ref-cred">Referencia (opcional)</Label>
                    <Input
                        id="pay-ref-cred"
                        className="pf-input"
                        type="text"
                        autoComplete="off"
                        placeholder="OC / Contrato / Autorización interna"
                        value={payment?.data?.referencia ?? ''}
                        onChange={(e) => setData(setPayment, { referencia: e.target.value })}
                    />
                </FormGroup>
            </div>
        );
    }

    // POS (default)
    return (
        <div className="payment-section">
            <FormGroup>
                <Label htmlFor="pay-voucher">N° de voucher POS</Label>
                <Input
                    id="pay-voucher"
                    className="pf-input"
                    type="text"
                    autoComplete="off"
                    placeholder="p.ej., 000123-XYZ"
                    value={payment?.data?.voucher ?? ''}
                    onChange={(e) => setData(setPayment, { voucher: e.target.value })}
                />
                <div className="pf-hint">El voucher debe coincidir con el emitido por el POS.</div>
            </FormGroup>
        </div>
    );
};

export default React.memo(PaymentFields);