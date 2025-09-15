import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, InputGroup, InputGroupText, Input, Label, FormGroup } from "reactstrap";
import { BASE_URL } from "../../utils/config";

/**
 * DocumentField (API antigua basada en ARRAYS)
 * props:
 *  - index
 *  - docType, setDocType            -> array de tipos (por slot)
 *  - idValues, setIdValues          -> array de números de doc (por slot)
 *  - userData, setUserData          -> array de objetos persona/empresa (por slot)
 *  - nationality                    -> string global
 */

const placeholderMap = {
    DNI: "DNI (8 dígitos)",
    CEE: "Carnet de Extranjería",
    RUC: "RUC (11 dígitos)",
};

const pathMap = {
    DNI: `${BASE_URL}/id/dni/`,
    CEE: `${BASE_URL}/id/cee/`,
    RUC: `${BASE_URL}/id/ruc/`,
};

const sanitize = (val, t) => {
    if (t === 'DNI') return (val || '').replace(/\D+/g, '').slice(0, 8);
    if (t === 'RUC') return (val || '').replace(/\D+/g, '').slice(0, 11);
    return (val || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
};

const isValid = (val, t) => {
    if (t === 'DNI') return /^\d{8}$/.test(val);
    if (t === 'RUC') return /^\d{11}$/.test(val);
    if (t === 'CEE') return /^[A-Z0-9-]{8,}$/.test(val);
    return false;
};

const DocumentField = ({ index, docType, setDocType, idValues, setIdValues, userData, setUserData, nationality }) => {
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        const css = `
      :root{ --line:#1f2a3b; --text:#e8ecf1; --muted:#9aa7b2; --ring:rgba(92,200,255,.45); --brand:#5cc8ff; --brand-600:#2bb7ff; }
      .guest-fields{ border:1px solid var(--line); border-radius:14px; padding:14px; background:#0f1626; color:var(--text); }
      .df-input{ background:#0f1626 !important; border:1px solid var(--line) !important; color:var(--text) !important; border-radius:12px !important; padding:12px 14px !important; }
      .df-input:focus{ outline:none; border-color:var(--brand) !important; box-shadow:0 0 0 4px var(--ring) !important; }
      .df-row{ display:grid; grid-template-columns:1fr; gap:12px; }
      @media(min-width:620px){ .df-row{ grid-template-columns:1fr 2fr; } }
      .df-btn{ border-radius:12px !important; border:0 !important; padding:10px 14px !important; font-weight:700 !important; background:linear-gradient(90deg, var(--brand), var(--brand-600)) !important; color:#05101c !important; }
      .df-status{ font-size:.82rem; color:var(--muted); margin-top:6px; min-height:1em; }
      .igx{ border-radius:12px; overflow:hidden; }
      .igx .input-group-text{ background:#0b1220; color:#dbeafe; border:1px solid var(--line); border-left:0; }
      .igx .form-control{ border-right:0; }
    `;
        let style = document.getElementById('documentfield-styles');
        if (!style) { style = document.createElement('style'); style.id = 'documentfield-styles'; document.head.appendChild(style); }
        style.textContent = css;
    }, []);

    const currentTypeValue = useMemo(
        () => docType[index] || (nationality === 'Peru' ? 'DNI' : 'CEE'),
        [docType, index, nationality]
    );

    const handleTypeChange = (e) => {
        const value = e.target.value;
        const td = [...docType];
        td[index] = value;
        setDocType(td);

        const ids = [...idValues];
        ids[index] = '';
        setIdValues(ids);

        const tmp = [...userData];
        tmp[index] = {
            ...tmp[index],
            nombres: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
            razonSocial: value === 'RUC' ? '' : undefined,
            direccion: value === 'RUC' ? '' : undefined,
            docType: value,
            docNumber: '',
            nationality,
        };
        setUserData(tmp);
        setStatusMsg('');
    };

    const handleIdChange = (e) => {
        const raw = e.target.value;
        const clean = sanitize(raw, currentTypeValue);
        const arr = [...idValues];
        arr[index] = clean;
        setIdValues(arr);
        setStatusMsg('');
    };

    const fetchIdData = async () => {
        const val = (idValues[index] || '').trim();
        const t = currentTypeValue;
        if (!isValid(val, t)) {
            toast.error('Documento inválido para el tipo seleccionado.');
            setStatusMsg('Documento inválido.');
            return;
        }
        try {
            setLoading(true);
            setStatusMsg('Validando documento…');
            const url = `${pathMap[t]}${val}`;
            const { data } = await axios.get(url, { withCredentials: true });
            const tmp = [...userData];

            if (t === 'RUC' && (data?.razonSocial || data?.direccion)) {
                tmp[index] = {
                    ...tmp[index],
                    razonSocial: data.razonSocial || '',
                    direccion: data.direccion || '',
                    nombres: data.razonSocial || '',
                    apellidoPaterno: '',
                    apellidoMaterno: '',
                    docType: t,
                    docNumber: val,
                    nationality,
                };
            } else if (data && (data.nombres || data.apellidoPaterno || data.apellido_materno || data.apellidoMaterno)) {
                tmp[index] = {
                    ...tmp[index],
                    nombres: data.nombres || '',
                    apellidoPaterno: data.apellido_paterno || data.apellidoPaterno || '',
                    apellidoMaterno: data.apellido_materno || data.apellidoMaterno || '',
                    razonSocial: undefined,
                    direccion: undefined,
                    docType: t,
                    docNumber: val,
                    nationality,
                };
            } else {
                toast.error('La respuesta no contiene los datos esperados.');
                setStatusMsg('Respuesta inesperada del servicio.');
                setLoading(false);
                return;
            }

            setUserData(tmp);
            setStatusMsg('Documento validado ✔');
            toast.success('Documento validado ✔');
        } catch (err) {
            console.error(err);
            const msg = err?.response?.data?.message || 'Error al validar el documento.';
            toast.error(msg);
            setStatusMsg('No se pudo validar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="guest-fields">
            <div className="df-row">
                <FormGroup>
                    <Label>Tipo de documento</Label>
                    <Input type="select" className="df-input" value={currentTypeValue} onChange={handleTypeChange}>
                        {nationality === 'Peru' ? (
                            <>
                                <option value="DNI">DNI</option>
                                <option value="RUC">RUC</option>
                                <option value="CEE">CEE</option>
                            </>
                        ) : (
                            <>
                                <option value="CEE">CEE</option>
                                <option value="RUC">RUC</option>
                            </>
                        )}
                    </Input>
                </FormGroup>

                <FormGroup>
                    <Label>Número</Label>
                    <InputGroup className="igx">
                        <Input
                            type="text"
                            className="df-input"
                            placeholder={placeholderMap[currentTypeValue] || 'Documento'}
                            value={idValues[index] || ''}
                            onChange={handleIdChange}
                            onKeyDown={(e) => { if (e.key === 'Enter') fetchIdData(); }}
                            aria-label="Número de documento"
                        />
                        <InputGroupText>
                            <Button disabled={loading} className="df-btn" onClick={fetchIdData} aria-live="polite">
                                {loading ? 'Validando…' : 'Validar'}
                            </Button>
                        </InputGroupText>
                    </InputGroup>
                    <div className="df-status" aria-live="polite">{statusMsg}</div>
                </FormGroup>
            </div>

            {(docType[index] || (nationality === 'Peru' ? 'DNI' : 'CEE')) === 'RUC' ? (
                <>
                    <FormGroup>
                        <Label>Nombre o razón social</Label>
                        <Input type="text" className="df-input" value={userData[index]?.razonSocial ?? userData[index]?.nombres ?? ''} readOnly disabled />
                    </FormGroup>
                    <FormGroup>
                        <Label>Dirección</Label>
                        <Input type="text" className="df-input" value={userData[index]?.direccion || ''} readOnly disabled />
                    </FormGroup>
                </>
            ) : (
                <>
                    <FormGroup>
                        <Label>Nombres</Label>
                        <Input type="text" className="df-input" value={userData[index]?.nombres || ''} readOnly disabled />
                    </FormGroup>
                    <FormGroup>
                        <Label>Apellido Paterno</Label>
                        <Input type="text" className="df-input" value={userData[index]?.apellidoPaterno || ''} readOnly disabled />
                    </FormGroup>
                    <FormGroup>
                        <Label>Apellido Materno</Label>
                        <Input type="text" className="df-input" value={userData[index]?.apellidoMaterno || ''} readOnly disabled />
                    </FormGroup>
                </>
            )}
        </div>
    );
};

export default React.memo(DocumentField);
