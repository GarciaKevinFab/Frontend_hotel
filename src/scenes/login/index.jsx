import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Paper,
    Stack,
    Typography,
    TextField,
    IconButton,
    InputAdornment,
    Button,
    FormControlLabel,
    Checkbox,
    useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

import AuthContext from "../../Context/AuthContext";
import { BASE_URL } from "../../utils/config";
import { tokens } from "../../theme";
import "./Login.css"; // opcional: sólo para el fondo

// helper para botones con gradiente consistente
const btn = (theme) => ({
    base: {
        borderRadius: 10,
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: ".2px",
    },
    solid: (key) => ({
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
    }),
});

export default function Login() {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const b = btn(theme);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            toast.error("Completa usuario y contraseña");
            return;
        }

        try {
            setLoading(true);
            const { data } = await axios.post(
                `${BASE_URL}/auth/login`,
                { username: username.trim().toLowerCase(), password },
                { headers: { "Content-Type": "application/json" } }
            );

            // si tu AuthContext usa sólo token, no cambiamos su firma
            login(data.token);

            // opcional: recuerda preferencia (no interfiere con tu AuthContext)
            if (remember) localStorage.setItem("remember_login", "1");
            else localStorage.removeItem("remember_login");

            toast.success("¡Inicio de sesión exitoso!");
            navigate("/");
        } catch (err) {
            const msg =
                err?.response?.data?.message || "No se pudo iniciar sesión.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            // fondo: usa tu CSS .login-container o quítalo y deja el sx
            className="login-container"
            sx={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                p: 2,
                // si quieres todo en MUI, descomenta el gradient y quita el CSS
                // background: `radial-gradient(90rem 30rem at 10% -10%, ${alpha(theme.palette.primary.main, .25)} 0%, transparent 50%),
                //              radial-gradient(60rem 30rem at 110% 120%, ${alpha(theme.palette.secondary.main, .25)} 0%, transparent 50%),
                //              ${colors.primary[500]}`
            }}
        >
            <Paper
                elevation={0}
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    width: "100%",
                    maxWidth: 420,
                    p: 3,
                    borderRadius: 3,
                    background: colors.primary[400],
                    border: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
                }}
            >
                <Stack spacing={2}>
                    <Typography
                        variant="h4"
                        fontWeight={800}
                        textAlign="center"
                        sx={{ letterSpacing: ".2px" }}
                    >
                        Admin Login
                    </Typography>
                    <Typography
                        variant="body2"
                        textAlign="center"
                        sx={{ opacity: 0.85, mb: 1 }}
                    >
                        Ingresa tus credenciales para continuar
                    </Typography>

                    <TextField
                        label="Usuario"
                        autoFocus
                        fullWidth
                        variant="filled"
                        name="username"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                    />

                    <TextField
                        label="Contraseña"
                        fullWidth
                        variant="filled"
                        name="password"
                        type={showPass ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        onClick={() => setShowPass((v) => !v)}
                                        edge="end"
                                        disabled={loading}
                                    >
                                        {showPass ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                sx={{ color: theme.palette.info.main }}
                            />
                        }
                        label="Recordarme en este dispositivo"
                    />

                    <Button
                        type="submit"
                        startIcon={<LoginIcon />}
                        disabled={loading}
                        sx={{ ...b.base, ...b.solid("primary"), py: 1.25 }}
                    >
                        {loading ? "Ingresando…" : "Ingresar"}
                    </Button>

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                    >
                        ¿Olvidaste tu contraseña? Contacta al administrador del sistema.
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
