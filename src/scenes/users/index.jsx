// src/scenes/users/index.jsx (UserManager)
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
  Skeleton,
  InputAdornment,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AddCircleOutline, Refresh, Search } from "@mui/icons-material";
import { toast } from "react-toastify";

import Header from "../../components/Header";
import UserForm from "../../components/User/UserForm";
import UserList from "../../components/User/UserList";
import CustomModal from "../../components/Modal/Modal";
import { tokens } from "../../theme";
import { BASE_URL } from "../../utils/config";

// —— estilos de botón coherentes (gradiente)
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
      boxShadow: `0 8px 26px ${alpha(theme.palette[key].dark || theme.palette[key].main, 0.45)}`,
    },
  }),
  outline: (key) => ({
    color: theme.palette[key].main,
    borderColor: alpha(theme.palette[key].main, 0.6),
    "&:hover": {
      borderColor: theme.palette[key].main,
      backgroundColor: alpha(theme.palette[key].main, 0.08),
    },
  }),
});

const defaultFormValues = { _id: undefined, username: "", password: "", role: "" };

export default function UserManager() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const b = btn(theme);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleModal = () => {
    setIsOpen((v) => !v);
    if (isOpen) setSelectedUser(null);
  };

  // —— API
  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data } = await axios.get(`${BASE_URL}/users`, { withCredentials: true });
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Error al cargar usuarios";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleFormSubmit = async (payload) => {
    const isEdit = Boolean(payload._id);
    const url = isEdit ? `${BASE_URL}/users/${payload._id}` : `${BASE_URL}/auth/register`;
    const method = isEdit ? "put" : "post";

    // No enviar _id al crear
    const body = { ...payload };
    if (!isEdit) delete body._id;

    try {
      setSaving(true);
      const { data: saved } = await axios[method](url, body, { withCredentials: true });

      if (isEdit) {
        setUsers((prev) => prev.map((u) => (u._id === saved._id ? saved : u)));
        toast.success("Usuario actualizado");
      } else {
        setUsers((prev) => [...prev, saved]);
        toast.success("Usuario creado");
      }
      toggleModal();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Error al guardar usuario";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const ok = window.confirm("¿Seguro que quieres eliminar este usuario?");
      if (!ok) return;
      await axios.delete(`${BASE_URL}/users/${id}`, { withCredentials: true });
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success("Usuario eliminado");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Error al eliminar usuario";
      setError(msg);
      toast.error(msg);
    }
  };

  // —— filtrado en memoria
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      `${u.username} ${u.role}`.toLowerCase().includes(term)
    );
  }, [users, q]);

  return (
    <Box m="20px">
      <Header title="User Management" subtitle="Crea, edita y elimina usuarios del sistema" />

      {/* Acciones + búsqueda */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2,
          borderRadius: 2,
          background: colors.primary[400],
          border: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
          <TextField
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por usuario o rol"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<Refresh />}
              sx={{ ...b.base, ...b.outline("info") }}
              onClick={loadUsers}
              disabled={loading}
            >
              {loading ? "Cargando…" : "Refrescar"}
            </Button>
            <Button
              startIcon={<AddCircleOutline />}
              sx={{ ...b.base, ...b.solid("success") }}
              onClick={() => {
                setSelectedUser(null);
                setIsOpen(true);
              }}
            >
              Nuevo usuario
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Errores */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.35)}` }}
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={loadUsers}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Lista / carga / vacío */}
      {loading ? (
        <Paper
          sx={{
            p: 2,
            borderRadius: 2,
            background: colors.primary[400],
            border: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
          }}
        >
          <Stack spacing={1}>
            <Skeleton variant="rounded" height={38} />
            <Skeleton variant="rounded" height={38} />
            <Skeleton variant="rounded" height={38} />
          </Stack>
        </Paper>
      ) : filtered.length === 0 ? (
        <Paper
          sx={{
            p: 2,
            textAlign: "center",
            borderRadius: 2,
            background: colors.primary[400],
            border: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
          }}
        >
          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
            No hay usuarios que coincidan con la búsqueda.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" mt={1}>
            <Chip
              size="small"
              label="Limpiar filtro"
              onClick={() => setQ("")}
              sx={{
                border: `1px solid ${theme.palette.info.main}`,
                color: theme.palette.info.main,
                bgcolor: alpha(theme.palette.info.main, 0.1),
              }}
            />
          </Stack>
        </Paper>
      ) : (
        <UserList onEdit={handleEdit} onDelete={handleDelete} users={filtered} />
      )}

      {/* Modal crear/editar */}
      <CustomModal
        isOpen={isOpen}
        toggle={toggleModal}
        title={selectedUser ? "Editar usuario" : "Nuevo usuario"}
      >
        <UserForm
          initialValues={selectedUser ? { ...defaultFormValues, ...selectedUser, password: "" } : defaultFormValues}
          handleFormSubmit={handleFormSubmit}
          saving={saving}
        />
      </CustomModal>
    </Box>
  );
}
