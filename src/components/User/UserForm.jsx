// src/components/User/UserForm.jsx
import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
    TextField,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    FormHelperText,
    InputAdornment,
    IconButton,
    ListItemIcon,
    Typography,
    useTheme,
    CircularProgress,
    FormControlLabel,
    Switch,
    LinearProgress,
    Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Formik } from "formik";
import * as yup from "yup";

// Icons
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutorenewIcon from "@mui/icons-material/Autorenew";

const roles = [
    { value: "admin", label: "Admin", icon: <AdminPanelSettingsIcon fontSize="small" /> },
    { value: "recepcionista", label: "Recepcionista", icon: <AssignmentIndIcon fontSize="small" /> },
    { value: "limpieza", label: "Limpieza", icon: <CleaningServicesIcon fontSize="small" /> },
];

// Botón con colores consistentes
const useButtonStyles = (theme) => ({
    base: {
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: ".2px",
        paddingInline: 2.2,
        paddingBlock: 1,
    },
    solidSecondary: {
        color: theme.palette.secondary.contrastText,
        background: `linear-gradient(90deg, ${alpha(theme.palette.secondary.main, 0.95)}, ${alpha(
            theme.palette.secondary.dark || theme.palette.secondary.main,
            0.92
        )})`,
        boxShadow: `0 8px 20px ${alpha(theme.palette.secondary.main, 0.35)}`,
        "&:hover": {
            background: `linear-gradient(90deg, ${alpha(
                theme.palette.secondary.dark || theme.palette.secondary.main,
                0.98
            )}, ${alpha(theme.palette.secondary.main, 0.98)})`,
            boxShadow: `0 8px 26px ${alpha(theme.palette.secondary.dark || theme.palette.secondary.main, 0.45)}`,
        },
        "&.Mui-disabled": {
            color: alpha(theme.palette.secondary.contrastText, 0.7),
            background: alpha(theme.palette.secondary.main, 0.45),
            boxShadow: "none",
        },
    },
});

const baseValidation = yup.object({
    username: yup
        .string()
        .transform((v) => (v ? v.trim() : v))
        .min(3, "Mínimo 3 caracteres")
        .max(40, "Máximo 40 caracteres")
        .required("Requerido"),
    role: yup.string().oneOf(roles.map((r) => r.value), "Rol inválido").required("Requerido"),
});

const makeSchema = (validatePassword) =>
    baseValidation.shape({
        password: yup.string().when([], {
            is: () => validatePassword,
            then: (s) =>
                s
                    .min(6, "Mínimo 6 caracteres")
                    .matches(/[A-Z]/, "Al menos una mayúscula")
                    .matches(/[a-z]/, "Al menos una minúscula")
                    .matches(/\d/, "Al menos un número")
                    .matches(/[^A-Za-z0-9]/, "Al menos un símbolo"),
            otherwise: (s) => s.strip(),
        }),
        confirmPassword: yup.string().when("password", {
            is: (val) => validatePassword && !!val,
            then: (s) => s.oneOf([yup.ref("password")], "No coincide").required("Requerido"),
            otherwise: (s) => s.strip(),
        }),
    });

// Generador simple de password fuerte
const genPassword = () => {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}";
    const len = 12 + Math.floor(Math.random() * 5); // 12-16
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
};

// Medidor de fuerza (0-4)
const scorePassword = (pwd = "") => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 4);
};

const UserForm = ({ initialValues, handleFormSubmit }) => {
    const theme = useTheme();
    const btn = useButtonStyles(theme);

    const isEdit = Boolean(initialValues?._id);
    const [changePassword, setChangePassword] = useState(!isEdit); // crear: true, editar: false
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [localPwd, setLocalPwd] = useState("");

    const validationSchema = useMemo(
        () => makeSchema(!isEdit || changePassword),
        [isEdit, changePassword]
    );

    const init = {
        username: initialValues?.username || "",
        role: initialValues?.role || "",
        password: "",
        confirmPassword: "",
    };

    const pwdScore = scorePassword(localPwd);
    const pwdBarSx = {
        height: 6,
        borderRadius: 999,
        "& .MuiLinearProgress-bar": {
            backgroundColor:
                pwdScore <= 1
                    ? theme.palette.error.main
                    : pwdScore === 2
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
        },
        backgroundColor: alpha(theme.palette.grey[500], 0.25),
    };

    return (
        <Formik
            enableReinitialize
            initialValues={init}
            validationSchema={validationSchema}
            onSubmit={async (vals, helpers) => {
                try {
                    const payload = { username: vals.username.trim(), role: vals.role };
                    if (!isEdit || changePassword) payload.password = vals.password;
                    if (isEdit) payload._id = initialValues._id;
                    await handleFormSubmit(payload);
                } finally {
                    helpers.setSubmitting(false);
                }
            }}
        >
            {({
                values,
                errors,
                touched,
                handleBlur,
                handleChange,
                handleSubmit,
                isSubmitting,
                setFieldValue,
            }) => (
                <form onSubmit={handleSubmit} noValidate>
                    <Box
                        display="grid"
                        gap={2.5}
                        gridTemplateColumns="repeat(4, minmax(0, 1fr))"
                        sx={{ "& > .field": { gridColumn: "span 4" } }}
                    >
                        {/* Username */}
                        <TextField
                            className="field"
                            fullWidth
                            variant="filled"
                            type="text"
                            label="Usuario"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.username}
                            error={Boolean(touched.username && errors.username)}
                            helperText={touched.username && errors.username}
                            InputProps={{
                                disableUnderline: true,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonOutlineIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Role */}
                        <FormControl
                            variant="filled"
                            fullWidth
                            className="field"
                            error={Boolean(touched.role && errors.role)}
                        >
                            <InputLabel id="role-label">Rol</InputLabel>
                            <Select
                                labelId="role-label"
                                label="Rol"
                                name="role"
                                value={values.role}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                MenuProps={{ PaperProps: { className: "cm-menu" } }}
                            >
                                {roles.map((r) => (
                                    <MenuItem key={r.value} value={r.value}>
                                        <ListItemIcon sx={{ minWidth: 32 }}>{r.icon}</ListItemIcon>
                                        <Typography variant="body2">{r.label}</Typography>
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>
                                {touched.role && errors.role ? errors.role : "Selecciona el rol del usuario"}
                            </FormHelperText>
                        </FormControl>

                        {/* Switch cambiar contraseña (solo en editar) */}
                        {isEdit && (
                            <Box className="field" display="flex" alignItems="center" justifyContent="space-between">
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={changePassword}
                                            onChange={(e) => {
                                                setChangePassword(e.target.checked);
                                                if (!e.target.checked) {
                                                    setFieldValue("password", "");
                                                    setFieldValue("confirmPassword", "");
                                                    setLocalPwd("");
                                                }
                                            }}
                                        />
                                    }
                                    label="Cambiar contraseña"
                                />
                                {!changePassword && (
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        La contraseña actual <b>no se puede mostrar ni recuperar</b>.
                                    </Typography>
                                )}
                            </Box>
                        )}

                        {/* Password + Confirm solo si crear o si se activa el switch */}
                        {(!isEdit || changePassword) && (
                            <>
                                <TextField
                                    className="field"
                                    fullWidth
                                    variant="filled"
                                    type={showPassword ? "text" : "password"}
                                    label={isEdit ? "Nueva contraseña" : "Contraseña"}
                                    name="password"
                                    autoComplete="new-password"
                                    onBlur={handleBlur}
                                    onChange={(e) => {
                                        handleChange(e);
                                        setLocalPwd(e.target.value);
                                    }}
                                    value={values.password}
                                    error={Boolean(touched.password && errors.password)}
                                    helperText={
                                        touched.password && errors.password
                                            ? errors.password
                                            : "Usa mayúsculas, minúsculas, números y símbolos."
                                    }
                                    InputProps={{
                                        disableUnderline: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Tooltip title="Generar contraseña segura">
                                                    <IconButton
                                                        onClick={() => {
                                                            const p = genPassword();
                                                            setFieldValue("password", p);
                                                            setLocalPwd(p);
                                                        }}
                                                        edge="end"
                                                        size="small"
                                                    >
                                                        <AutorenewIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={showPassword ? "Ocultar" : "Mostrar"}>
                                                    <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Copiar">
                                                    <IconButton
                                                        onClick={async () => {
                                                            try {
                                                                await navigator.clipboard.writeText(values.password || "");
                                                            } catch {
                                                                // noop
                                                            }
                                                        }}
                                                        edge="end"
                                                        size="small"
                                                    >
                                                        <ContentCopyIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                {/* Barra de fuerza */}
                                <Box className="field" sx={{ mt: -1 }}>
                                    <LinearProgress variant="determinate" value={(pwdScore / 4) * 100} sx={pwdBarSx} />
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Fuerza: {["Débil", "Básica", "Media", "Fuerte", "Excelente"][pwdScore]}
                                    </Typography>
                                </Box>

                                <TextField
                                    className="field"
                                    fullWidth
                                    variant="filled"
                                    type={showConfirm ? "text" : "password"}
                                    label="Confirmar contraseña"
                                    name="confirmPassword"
                                    autoComplete="new-password"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.confirmPassword}
                                    error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                                    helperText={touched.confirmPassword && errors.confirmPassword}
                                    InputProps={{
                                        disableUnderline: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="mostrar u ocultar confirmación"
                                                    onClick={() => setShowConfirm((s) => !s)}
                                                    edge="end"
                                                    size="small"
                                                >
                                                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </>
                        )}
                    </Box>

                    <Box display="flex" justifyContent="flex-end" mt={2.5}>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ ...btn.base, ...btn.solidSecondary }}
                            disabled={isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
                        >
                            {isEdit ? "Actualizar usuario" : "Crear usuario"}
                        </Button>
                    </Box>
                </form>
            )}
        </Formik>
    );
};

export default UserForm;
