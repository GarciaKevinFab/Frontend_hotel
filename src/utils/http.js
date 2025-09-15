import axios from "axios";
import { BASE_URL } from "./config";

// Permite override en producción vía window.ENV.BASE_URL, si lo inyectas.
const runtimeBase =
    (typeof window !== "undefined" && window.ENV && window.ENV.BASE_URL) ||
    BASE_URL;

export const http = axios.create({
    baseURL: runtimeBase,
    timeout: 20000,
});

// Interceptor opcional de errores (mejor UX en consola)
http.interceptors.response.use(
    (res) => res,
    (err) => {
        const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err.message ||
            "Error de red";
        console.error("[HTTP ERROR]", err?.response?.status || "-", msg);
        return Promise.reject(err);
    }
);
