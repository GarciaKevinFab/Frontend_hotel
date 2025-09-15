import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Box,
    Typography,
    Tooltip,
    Chip,
    useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    AdminPanelSettingsOutlined as AdminIcon,
    AssignmentInd as RecepcionIcon,
    CleaningServices as LimpiezaIcon,
} from "@mui/icons-material";
import { tokens } from "../../theme";

const roleMeta = (theme, role) => {
    const r = String(role || "").toLowerCase();
    if (r === "admin")
        return { label: "Admin", key: "secondary", icon: <AdminIcon fontSize="small" /> };
    if (r === "recepcionista")
        return { label: "Recepcionista", key: "info", icon: <RecepcionIcon fontSize="small" /> };
    if (r === "limpieza")
        return { label: "Limpieza", key: "success", icon: <LimpiezaIcon fontSize="small" /> };
    return { label: role || "—", key: "default", icon: null };
};

// Botones consistentes (gradiente + hover)
const btnStyles = (theme) => ({
    base: {
        borderRadius: 10,
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: ".2px",
    },
    solid: (paletteKey) => ({
        color: theme.palette[paletteKey].contrastText,
        background: `linear-gradient(90deg, ${alpha(
            theme.palette[paletteKey].main,
            0.95
        )}, ${alpha(theme.palette[paletteKey].dark || theme.palette[paletteKey].main, 0.92)})`,
        boxShadow: `0 8px 20px ${alpha(theme.palette[paletteKey].main, 0.35)}`,
        "&:hover": {
            background: `linear-gradient(90deg, ${alpha(
                theme.palette[paletteKey].dark || theme.palette[paletteKey].main,
                0.98
            )}, ${alpha(theme.palette[paletteKey].main, 0.98)})`,
            boxShadow: `0 8px 26px ${alpha(theme.palette[paletteKey].dark || theme.palette[paletteKey].main, 0.45)}`,
        },
    }),
});

const UserList = ({ onEdit, onDelete, users = [] }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const btn = btnStyles(theme);

    if (!users.length) {
        return (
            <Paper
                sx={{
                    p: 2,
                    backgroundColor: colors.primary[400],
                    border: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
                    textAlign: "center",
                    borderRadius: 2,
                }}
            >
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                    No hay usuarios para mostrar.
                </Typography>
            </Paper>
        );
    }

    return (
        <TableContainer
            component={Paper}
            sx={{
                backgroundColor: colors.primary[400],
                border: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
                borderRadius: 2,
            }}
        >
            <Box
                sx={{
                    px: 2,
                    py: 1.2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
                    background: `linear-gradient(90deg, ${alpha(colors.blueAccent[700], 0.85)}, ${alpha(
                        theme.palette.primary.main,
                        0.35
                    )})`,
                    color: colors.grey[100],
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                }}
            >
                <Typography variant="h6" fontWeight={800}>
                    Usuarios
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total: {users.length}
                </Typography>
            </Box>

            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell
                            sx={{
                                backgroundColor: colors.blueAccent[700],
                                color: colors.grey[100],
                                fontWeight: 800,
                            }}
                        >
                            Usuario
                        </TableCell>
                        <TableCell
                            sx={{
                                backgroundColor: colors.blueAccent[700],
                                color: colors.grey[100],
                                fontWeight: 800,
                                width: 220,
                            }}
                        >
                            Rol
                        </TableCell>
                        <TableCell
                            align="right"
                            sx={{
                                backgroundColor: colors.blueAccent[700],
                                color: colors.grey[100],
                                fontWeight: 800,
                                width: 260,
                            }}
                        >
                            Acciones
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {users.map((user, idx) => {
                        const isZebra = idx % 2 === 1;
                        const meta = roleMeta(theme, user.role);
                        const baseColor = meta.key !== "default" ? theme.palette[meta.key].main : colors.grey[300];

                        return (
                            <TableRow
                                key={user._id}
                                hover
                                sx={{
                                    backgroundColor: isZebra ? alpha(baseColor, 0.04) : "transparent",
                                    "&:hover": { backgroundColor: alpha(baseColor, 0.08) },
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontWeight: meta.key === "secondary" ? 800 : 500,
                                        color: meta.key === "secondary" ? theme.palette.secondary.main : "inherit",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    {user.username}
                                    {meta.key === "secondary" && <AdminIcon fontSize="small" />}
                                </TableCell>

                                <TableCell>
                                    <Chip
                                        icon={meta.icon}
                                        label={meta.label}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            borderColor: meta.key !== "default" ? theme.palette[meta.key].main : colors.grey[400],
                                            color: meta.key !== "default" ? theme.palette[meta.key].main : colors.grey[300],
                                            bgcolor:
                                                meta.key !== "default"
                                                    ? alpha(theme.palette[meta.key].main, 0.12)
                                                    : alpha(colors.grey[400], 0.12),
                                            textTransform: "capitalize",
                                            fontWeight: 700,
                                        }}
                                    />
                                </TableCell>

                                <TableCell align="right">
                                    <Tooltip title="Editar usuario">
                                        <span>
                                            <Button
                                                size="small"
                                                startIcon={<EditIcon />}
                                                sx={{ ...btn.base, ...btn.solid("info"), mr: 1 }}
                                                onClick={() => onEdit(user)}
                                            >
                                                Editar
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Eliminar usuario">
                                        <span>
                                            <Button
                                                size="small"
                                                startIcon={<DeleteIcon />}
                                                sx={{ ...btn.base, ...btn.solid("error") }}
                                                onClick={() => {
                                                    if (window.confirm(`¿Eliminar al usuario "${user.username}"?`)) {
                                                        onDelete(user._id);
                                                    }
                                                }}
                                            >
                                                Eliminar
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default UserList;
