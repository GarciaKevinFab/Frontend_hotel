// src/scenes/global/Sidebar.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Box, IconButton, Typography, Tooltip, useTheme, Avatar, Divider } from "@mui/material";
import { alpha, darken } from "@mui/material/styles";
import { Link, useLocation } from "react-router-dom";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";

// ICONOS
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import BookOnlineOutlinedIcon from "@mui/icons-material/BookOnlineOutlined";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";

// IMPORTA TU LOGO
import logoPng from "../../assets/img/logo.png";

// =========================
// Config de navegación
// =========================
const NAV = [
  {
    heading: "Principal",
    items: [{ title: "Dashboard", to: "/", icon: <HomeOutlinedIcon /> }],
  },
  {
    heading: "Operaciones",
    items: [
      { title: "Booking", to: "/booking", icon: <BookOnlineOutlinedIcon /> },
      { title: "Rooms", to: "/room", icon: <BedOutlinedIcon /> },
      { title: "Invoices Balances", to: "/invoices", icon: <RequestQuoteOutlinedIcon /> },
      { title: "Factura", to: "/invoice", icon: <ReceiptLongOutlinedIcon /> },
      { title: "Reports", to: "/report", icon: <AssessmentOutlinedIcon /> },
    ],
  },
  {
    heading: "Gestión",
    items: [{ title: "Manage Team", to: "/user", icon: <PeopleOutlinedIcon /> }],
  },
  {
    heading: "Agenda",
    items: [{ title: "Calendar", to: "/calendar", icon: <EventOutlinedIcon /> }],
  },
  {
    heading: "Analítica",
    items: [
      { title: "Bar Chart", to: "/bar", icon: <BarChartOutlinedIcon /> },
      { title: "Geography", to: "/geography", icon: <MapOutlinedIcon /> },
    ],
  },
];

// =========================
// Item con tooltip si colapsado
// =========================
function NavItem({ item, active, collapsed }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const content = (
    <MenuItem active={active} style={{ color: colors.grey[100], borderRadius: 10 }} icon={item.icon}>
      <Typography component="span" sx={{ fontWeight: 600 }}>
        {item.title}
      </Typography>
      <Link to={item.to} aria-current={active ? "page" : undefined} />
    </MenuItem>
  );

  if (!collapsed) return content;

  // Tooltip solo cuando está colapsado
  return (
    <Tooltip title={item.title} placement="right">
      {content}
    </Tooltip>
  );
}

export default function Sidebar() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { pathname } = useLocation();

  // Persistencia del colapso
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar:collapsed");
    return saved === "true";
  });
  useEffect(() => {
    localStorage.setItem("sidebar:collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Activo por ruta (empate por prefijo)
  const isActive = useCallback((to) => (to === "/" ? pathname === "/" : pathname.startsWith(to)), [pathname]);

  // Estilos globales del ProSidebar
  const shellSx = useMemo(
    () => ({
      "& .pro-sidebar-inner": {
        background: `linear-gradient(180deg, ${alpha(colors.primary[400], 0.92)}, ${alpha(
          darken(colors.primary[400], 0.15),
          0.96
        )}) !important`,
        borderRight: `1px solid ${alpha(colors.blueAccent[700], 0.35)}`,
      },
      "& .pro-icon-wrapper": { backgroundColor: "transparent !important" },
      "& .pro-inner-item": {
        padding: "8px 18px !important",
        borderRadius: "10px",
        margin: "4px 8px",
        transition: "background .15s ease, color .15s ease",
      },
      "& .pro-inner-item:hover": {
        color: `${theme.palette.info.light} !important`,
        backgroundColor: `${alpha(theme.palette.info.main, 0.08)} !important`,
      },
      "& .pro-menu-item.active": {
        color: `${theme.palette.secondary.light} !important`,
        backgroundColor: `${alpha(theme.palette.secondary.main, 0.12)} !important`,
        boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.secondary.main, 0.25)}`,
      },
      // Scrollbar más decente
      "& .pro-sidebar-inner::-webkit-scrollbar": { width: 8 },
      "& .pro-sidebar-inner::-webkit-scrollbar-thumb": {
        background: alpha(colors.blueAccent[700], 0.4),
        borderRadius: 8,
      },
    }),
    [colors, theme]
  );

  return (
    <Box sx={shellSx}>
      <ProSidebar collapsed={isCollapsed}>
        <Menu iconShape="square">
          {/* LOGO + TOGGLE */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{ margin: "10px 0 14px 0", color: colors.grey[100] }}
          >
            {!isCollapsed && (
              <Box display="flex" justifyContent="space-between" alignItems="center" ml="10px" width="100%">
                {/* Logo en vez de texto */}
                <Box display="flex" alignItems="center" gap={1}>
                  <img
                    src={logoPng}
                    alt="Logo"
                    style={{
                      height: 45,
                      objectFit: "contain",
                      filter: "drop-shadow(0 2px 6px rgba(0,0,0,.25))",
                    }}
                  />
                </Box>

                <IconButton
                  size="small"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
                >
                  <MenuOutlinedIcon />
                </IconButton>
              </Box>
            )}
          </MenuItem>

          {/* PERFIL */}
          {!isCollapsed && (
            <Box mb={1.5} px={1}>
              <Box display="flex" justifyContent="center" alignItems="center">
                <Avatar
                  alt="Kevin"
                  src={require("../../assets/img/user.png")}
                  sx={{
                    width: 84,
                    height: 84,
                    boxShadow: 3,
                    border: `2px solid ${alpha(colors.blueAccent[700], 0.6)}`,
                  }}
                />
              </Box>
              <Typography variant="h6" color={colors.grey[100]} fontWeight={900} textAlign="center" sx={{ mt: 1 }}>
                K3V1N
              </Typography>
              <Divider sx={{ mt: 1.2, borderColor: alpha(colors.blueAccent[700], 0.35) }} />
            </Box>
          )}

          {/* NAV */}
          <Box paddingLeft={isCollapsed ? 0 : "6px"} pr={isCollapsed ? 0 : "6px"}>
            {NAV.map((section) => (
              <Box key={section.heading} sx={{ mb: 0.5 }}>
                {!isCollapsed && (
                  <Typography
                    variant="overline"
                    color={alpha(colors.grey[300], 0.9)}
                    sx={{ mx: "20px", display: "block", letterSpacing: ".8px" }}
                  >
                    {section.heading}
                  </Typography>
                )}

                {section.items.map((item) => (
                  <NavItem key={item.to} item={item} active={isActive(item.to)} collapsed={isCollapsed} />
                ))}
              </Box>
            ))}
          </Box>

          {/* FOOTER mini (solo versión, sin marca) */}
          <Box
            sx={{
              mt: 1,
              mb: 1,
              px: isCollapsed ? 0 : 2,
              opacity: 0.8,
              textAlign: isCollapsed ? "center" : "left",
            }}
          >
            <Typography variant="caption" color={alpha(colors.grey[300], 0.8)}>
              v1.0
            </Typography>
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
}
