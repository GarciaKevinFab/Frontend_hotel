// src/components/Invoice/InvoiceFormPro.jsx
import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { BASE_URL } from "../../utils/config";
import "./invoice-form.css";

const http = axios.create({
    baseURL: BASE_URL, // "http://localhost:4000/api"
    timeout: 30000
});
const IGV_RATE = 0.18;
const EMISOR_RUC = "20602208070"; // RUC FIJO

function calcTotals(items) {
    let gravadas = 0, exoneradas = 0, igv = 0;
    for (const it of items || []) {
        const cant = Number(it?.cantidad || 0);
        const p = Number(it?.precioUnitario || 0);
        const afe = it?.tipAfeIgv || "10";
        if (cant <= 0 || p < 0) continue;
        if (afe === "10") {
            const unitSinIgv = p / (1 + IGV_RATE);
            const valorVenta = +(unitSinIgv * cant).toFixed(2);
            const igvItem = +(valorVenta * IGV_RATE).toFixed(2);
            gravadas += valorVenta; igv += igvItem;
        } else {
            const valorVenta = +(p * cant).toFixed(2);
            exoneradas += valorVenta;
        }
    }
    gravadas = +gravadas.toFixed(2);
    exoneradas = +exoneradas.toFixed(2);
    igv = +igv.toFixed(2);
    const valorVenta = +(gravadas + exoneradas).toFixed(2);
    const total = +(valorVenta + igv).toFixed(2);
    return { gravadas, exoneradas, igv, valorVenta, subTotal: valorVenta, total };
}
const money = (n) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(Number(n || 0));

export default function InvoiceFormPro() {
    const calcCompact = () => window.innerHeight < 820 || window.innerWidth < 1280;
    const [compact, setCompact] = useState(calcCompact());
    const [lastDoc, setLastDoc] = useState(null);
    const [sending, setSending] = useState(false);
    const [downloading, setDownloading] = useState(null);
    const [toast, setToast] = useState(null);
    const addBtnRef = useRef(null);
    const containerRef = useRef(null);

    const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm({
        defaultValues: {
            ruc: EMISOR_RUC, // FIJO
            tipoDocumento: "01",
            serie: "F001",
            numero: "1", // como string
            fechaEmision: new Date().toISOString().slice(0, 10),
            tipoMoneda: "PEN",
            tipoOperacion: "0101",
            clienteTipoDoc: "6",
            customerEmail: "",
            customerRuc: "",
            customerName: "",
            customerAddress: "",
            items: [{ descripcion: "", cantidad: 1, precioUnitario: 0, codigo: "", tipAfeIgv: "10" }],
        },
        mode: "onBlur",
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });
    const itemsWatch = useWatch({ control, name: "items" });
    const headWatch = useWatch({ control, name: ["tipoDocumento", "serie", "numero"] }); // ruc fuera: es fijo
    const totals = useMemo(() => calcTotals(itemsWatch), [itemsWatch]);

    useLayoutEffect(() => {
        const topbarEl = document.querySelector("[data-topbar]");
        const update = () => {
            const h = topbarEl ? Math.ceil(topbarEl.getBoundingClientRect().height) : 0;
            containerRef.current?.style.setProperty("--sticky-offset", `${h + 12}px`);
        };
        update();
        const ro = new ResizeObserver(update);
        if (topbarEl) ro.observe(topbarEl);
        window.addEventListener("resize", update);
        return () => { ro.disconnect(); window.removeEventListener("resize", update); };
    }, []);

    useEffect(() => {
        const onResize = () => setCompact(calcCompact());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                const cur = getValues("tipoDocumento");
                const next = cur === "01" ? "03" : "01";
                setValue("tipoDocumento", next);
                setToast({ type: "info", title: "Tipo cambiado", description: `Ahora: ${next === "01" ? "Factura (01)" : "Boleta (03)"}` });
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [getValues, setValue]);

    useEffect(() => {
        const h = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                handleSubmit(onSubmit)();
            }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [handleSubmit]);

    const renderError = (err) => {
        const data = err?.response?.data;
        if (data?.errors && typeof data.errors === 'object') {
            const msgs = Object.entries(data.errors).flatMap(([k, arr]) => arr).join(' | ');
            return msgs || data.title || 'Error de validación';
        }
        return data?.message || err.message || 'Error desconocido';
    };

    const onSubmit = async (form) => {
        try {
            setSending(true);
            const payload = {
                ...form,
                ruc: EMISOR_RUC, // SIEMPRE FIJO
                numero: String(form.numero ?? ''),
                serie: String(form.serie || '').toUpperCase()
            };
            const resp = await http.post(`/invoice`, payload);
            setToast({ type: "success", title: "Comprobante emitido", description: `ID Local: ${resp.data.idLocal}` });
            setLastDoc({ empresa_Ruc: EMISOR_RUC, tipo_Doc: payload.tipoDocumento, serie: payload.serie, correlativo: payload.numero });
        } catch (err) {
            const msg = renderError(err);
            setToast({ type: "error", title: "No se pudo emitir", description: String(msg) });
            console.error('[HTTP ERROR]', err?.response?.status, err?.response?.data || err.message);
        } finally {
            setSending(false);
        }
    };

    async function descargar(kind) {
        try {
            setDownloading(kind);
            let doc = lastDoc;
            if (!doc) {
                const [tipoDocumento, serie, numero] = headWatch || [];
                if (!tipoDocumento || !serie || !numero) {
                    setToast({ type: "warning", title: "Falta información", description: "Completa tipo, serie y número o emite primero." });
                    return;
                }
                doc = { empresa_Ruc: EMISOR_RUC, tipo_Doc: tipoDocumento, serie: String(serie).toUpperCase(), correlativo: String(numero) };
                setLastDoc(doc);
            }
            const resp = await http.post(`/invoice/${kind}`, doc, { responseType: "blob" });
            let ext = "bin", mime = "application/octet-stream";
            if (kind === "pdf") { ext = "pdf"; mime = "application/pdf"; }
            if (kind === "xml") { ext = "xml"; mime = "application/xml"; }
            if (kind === "cdr") { ext = "zip"; mime = "application/zip"; }
            const blob = new Blob([resp.data], { type: mime });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${doc.tipo_Doc}-${doc.serie}-${doc.correlativo}.${ext}`;
            document.body.appendChild(link);
            link.click(); link.remove(); URL.revokeObjectURL(link.href);
            setToast({ type: "success", title: "Archivo listo", description: `Descargado: ${link.download}` });
        } catch (err) {
            const msg = renderError(err);
            setToast({ type: "error", title: "Descarga fallida", description: String(msg) });
            console.error('[HTTP ERROR]', err?.response?.status, err?.response?.data || err.message);
        } finally {
            setDownloading(null);
        }
    }

    // Listo si hay tipo, serie y número o ya hay lastDoc
    const isReadyToDownload = Boolean((headWatch?.[0] && headWatch?.[1] && headWatch?.[2]) || lastDoc);
    const handleAddItem = () => {
        append({ descripcion: "", cantidad: 1, precioUnitario: 0, codigo: "", tipAfeIgv: "10" });
        addBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // -------- Validación/autocompletado de Cliente --------
    const validarCliente = async () => {
        try {
            const tipo = getValues("clienteTipoDoc");      // '6' (RUC) o '1' (DNI)
            const nro = (getValues("customerRuc") || '').trim();

            if (tipo === '6') { // RUC
                if (!/^\d{11}$/.test(nro)) throw new Error("RUC inválido (11 dígitos).");
                const { data } = await http.get(`/id/ruc/${nro}`);
                const razon = data?.razonSocial || '';
                const dir = data?.direccion || '';
                if (!razon) throw new Error("No se encontró razón social para ese RUC.");
                setValue("customerName", razon, { shouldDirty: true, shouldValidate: true });
                setValue("customerAddress", dir || "—", { shouldDirty: true, shouldValidate: true });
                setToast({ type: "success", title: "Cliente validado", description: razon });
            } else if (tipo === '1') { // DNI
                if (!/^\d{8}$/.test(nro)) throw new Error("DNI inválido (8 dígitos).");
                const { data } = await http.get(`/id/dni/${nro}`);
                const nombres = [data?.nombres, data?.apellidoPaterno, data?.apellidoMaterno].filter(Boolean).join(' ');
                if (!nombres) throw new Error("No se encontraron nombres para ese DNI.");
                setValue("customerName", nombres, { shouldDirty: true, shouldValidate: true });
                setValue("customerAddress", "—", { shouldDirty: true, shouldValidate: true }); // DNI no devuelve dirección
                setToast({ type: "success", title: "Cliente validado", description: nombres });
            } else {
                throw new Error("Tipo de documento no soportado en este formulario.");
            }
        } catch (e) {
            setToast({ type: "error", title: "Validación fallida", description: e.message || "No se pudo validar" });
        }
    };

    return (
        <div ref={containerRef} className={["inv-container theme-dark", "layout-stretch", compact ? "density-compact" : ""].join(" ")}>
            <div className="inv-header">
                <div className="inv-header-left">
                    <h1 className="inv-title">Emitir Comprobante</h1>
                    <p className="inv-subtitle">Factura / Boleta electrónica.</p>
                    <div className="badges">
                        <span className="badge"><span className="badge-dot" />IGV 18% Perú</span>
                        <span className="badge"><span className="badge-dot" />Admin Panel</span>
                        <span className="badge"><span className="badge-dot" />Atajos: Ctrl/Cmd+B, Ctrl/Cmd+S</span>
                    </div>
                </div>
                <div className="inv-actions inv-header-right">
                    <button type="button" onClick={() => reset()} className="btn btn-outline">Limpiar</button>
                    <button type="button" disabled={!isReadyToDownload || downloading === "pdf"} onClick={() => descargar("pdf")} className="btn btn-primary">{downloading === "pdf" ? "Descargando…" : "Descargar PDF"}</button>
                    <button type="button" disabled={!isReadyToDownload || downloading === "xml"} onClick={() => descargar("xml")} className="btn btn-soft-primary">{downloading === "xml" ? "Descargando…" : "XML"}</button>
                    <button type="button" disabled={!isReadyToDownload || downloading === "cdr"} onClick={() => descargar("cdr")} className="btn btn-soft">{downloading === "cdr" ? "Descargando…" : "CDR"}</button>
                </div>
            </div>

            <div className="inv-grid">
                <form onSubmit={handleSubmit(onSubmit)} className="inv-form">
                    {/* Emisor */}
                    <section className="card">
                        <h2 className="card-title">Emisor</h2>
                        <div className="grid-6">
                            <div className="col-span-2">
                                <label className="label">RUC *</label>
                                <input
                                    className="field"
                                    value={EMISOR_RUC}
                                    readOnly
                                    disabled
                                    {...register("ruc")}
                                />
                                <p className="muted" style={{ marginTop: 6 }}>RUC fijo del emisor.</p>
                            </div>
                            <div>
                                <label className="label">Tipo Doc *</label>
                                <select className="field" {...register("tipoDocumento", { required: true })}>
                                    <option value="01">Factura (01)</option>
                                    <option value="03">Boleta (03)</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Serie *</label>
                                <input className="field" placeholder="F001" {...register("serie", { required: "Serie requerida", pattern: { value: /^[FB]\d{3}$/i, message: "Usa F### o B###" } })} onBlur={(e) => setValue("serie", (e.target.value || "").toUpperCase())} />
                                {errors?.serie && <p className="error-msg">{errors.serie.message}</p>}
                            </div>
                            <div>
                                <label className="label">Número *</label>
                                <input className="field right num" {...register("numero", { required: true })} />
                            </div>
                            <div>
                                <label className="label">Fecha Emisión *</label>
                                <input type="date" className="field" {...register("fechaEmision", { required: true })} />
                            </div>
                            <div>
                                <label className="label">Moneda</label>
                                <select className="field" {...register("tipoMoneda")}>
                                    <option value="PEN">Soles (PEN)</option>
                                    <option value="USD">Dólares (USD)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Cliente */}
                    <section className="card">
                        <h2 className="card-title">Cliente</h2>
                        <div className="grid-6">
                            <div className="col-span-2">
                                <label className="label">Email</label>
                                <input type="email" className="field" placeholder="cliente@correo.com" {...register("customerEmail")} />
                            </div>
                            <div>
                                <label className="label">Tipo Doc</label>
                                <select className="field" {...register("clienteTipoDoc")}>
                                    <option value="6">RUC (6)</option>
                                    <option value="1">DNI (1)</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">RUC / DNI *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                                    <input className="field" {...register("customerRuc", { required: true })} />
                                    <button type="button" onClick={validarCliente} className="btn btn-soft-primary">Validar doc.</button>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="label">Razón Social / Nombre *</label>
                                <input className="field" {...register("customerName", { required: true })} />
                            </div>
                            <div className="col-span-3">
                                <label className="label">Dirección *</label>
                                <input className="field" {...register("customerAddress", { required: true })} />
                            </div>
                        </div>
                    </section>

                    {/* Ítems */}
                    <section className="card">
                        <div className="card-row">
                            <h2 className="card-title">Ítems</h2>
                            <div className="items-actions-hdr">
                                <button type="button" ref={addBtnRef} onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0, codigo: "", tipAfeIgv: "10" })} className="btn btn-dark">+ Agregar ítem</button>
                            </div>
                        </div>

                        <div className="items-table">
                            <div className="items-head sticky">
                                <div className="col-des">Descripción</div>
                                <div className="col-cod">Código</div>
                                <div className="col-cant right">Cant.</div>
                                <div className="col-afe">Afectación</div>
                                <div className="col-pre right">Precio c/IGV</div>
                                <div className="col-imp right">Importe</div>
                                <div className="col-act" />
                            </div>

                            <div className="items-body">
                                <AnimatePresence initial={false}>
                                    {fields.map((item, index) => {
                                        const afe = itemsWatch?.[index]?.tipAfeIgv;
                                        const cantidad = Number(itemsWatch?.[index]?.cantidad || 0);
                                        const precio = Number(itemsWatch?.[index]?.precioUnitario || 0);
                                        const importe = +(cantidad * precio).toFixed(2);
                                        const onPressEnterAdd = (e) => { if (e.key === "Enter") { e.preventDefault(); append({ descripcion: "", cantidad: 1, precioUnitario: 0, codigo: "", tipAfeIgv: "10" }); } };

                                        return (
                                            <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="item-row row-grid">
                                                <div className="col-des">
                                                    <label className="label sm-hidden">Descripción *</label>
                                                    <input className="field" placeholder="Servicio o producto" {...register(`items.${index}.descripcion`, { required: true })} />
                                                </div>
                                                <div className="col-cod">
                                                    <label className="label sm-hidden">Código</label>
                                                    <input className="field" placeholder="SKU/INT" {...register(`items.${index}.codigo`)} />
                                                </div>
                                                <div className="col-cant">
                                                    <label className="label sm-hidden">Cant.</label>
                                                    <input type="number" inputMode="decimal" step="0.0001" min={0} className="field right num" {...register(`items.${index}.cantidad`, { valueAsNumber: true, min: 0 })} />
                                                </div>
                                                <div className="col-afe">
                                                    <label className="label sm-hidden">Afectación</label>
                                                    <select className="field" {...register(`items.${index}.tipAfeIgv`)}>
                                                        <option value="10">Gravado (IGV)</option>
                                                        <option value="20">Exonerado</option>
                                                    </select>
                                                    <div style={{ marginTop: 8 }}>
                                                        <span className={`chip ${afe === "10" ? "igv" : "exo"}`}>{afe === "10" ? "IGV 18%" : "Exonerado"}</span>
                                                    </div>
                                                </div>
                                                <div className="col-pre currency">
                                                    <label className="label sm-hidden">Precio c/IGV *</label>
                                                    <input type="number" inputMode="decimal" step="0.000001" min={0} className="field right num" placeholder="0.00" onKeyDown={onPressEnterAdd} {...register(`items.${index}.precioUnitario`, { valueAsNumber: true, min: 0 })} />
                                                </div>
                                                <div className="col-imp">
                                                    <label className="label sm-hidden">Importe</label>
                                                    <input className="field right readonly num" readOnly value={money(importe)} />
                                                </div>
                                                <div className="col-act">
                                                    <button type="button" onClick={() => remove(index)} className="icon-btn danger" aria-label="Eliminar">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM8 10h2v8H8v-8Z" /></svg>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            <div className="items-foot">
                                <div className="foot-left muted">Enter en “Precio c/IGV” agrega un ítem nuevo.</div>
                                <div className="foot-right"><span className="muted">Ítems:</span> <strong className="num">{fields.length}</strong></div>
                            </div>
                        </div>

                        <div className="items-fab"><button type="button" onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0, codigo: "", tipAfeIgv: "10" })} className="fab">+</button></div>
                    </section>

                    <div className="cta-bar">
                        <div className="cta-hint">Revisa los datos antes de emitir. Se aplicará IGV del 18% para afectación 10.</div>
                        <button type="submit" disabled={sending} className="btn btn-dark-lg">{sending ? "Emitiendo…" : "Crear / Enviar Factura"}</button>
                    </div>
                </form>

                {/* Aside Resumen */}
                <aside className="inv-aside">
                    <div className="card">
                        <h3 className="card-title sm">Resumen</h3>
                        <dl className="summary">
                            <div className="row"><dt>Gravadas</dt><dd className="num">{money(totals.gravadas)}</dd></div>
                            <div className="row"><dt>Exoneradas</dt><dd className="num">{money(totals.exoneradas)}</dd></div>
                            <div className="row"><dt>IGV (18%)</dt><dd className="num">{money(totals.igv)}</dd></div>
                            <div className="sep" />
                            <div className="row"><dt>Valor Venta</dt><dd className="num">{money(totals.valorVenta)}</dd></div>
                            <div className="row"><dt>Sub Total</dt><dd className="num">{money(totals.subTotal)}</dd></div>
                            <div className="row total"><dt>Total</dt><dd className="num">{money(totals.total)}</dd></div>
                        </dl>
                    </div>
                    <div className="card small">
                        <p className="muted bold">Buenas prácticas</p>
                        <ul className="bullets">
                            <li>Precio unitario incluye IGV cuando la afectación es gravada (10).</li>
                            <li>Para exonerados (20) no se aplica IGV.</li>
                            <li>Guarda el PDF, XML y CDR como respaldo.</li>
                        </ul>
                    </div>
                </aside>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className={`toast toast-${toast.type || "info"}`}>
                        <div className="toast-dot" />
                        <div className="toast-body">
                            <p className="toast-title">{toast.title}</p>
                            {toast.description && <p className="toast-desc">{toast.description}</p>}
                        </div>
                        <button onClick={() => setToast(null)} className="toast-close">Cerrar</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
