import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Dashboard from "./scenes/dashboard";
import Invoices from "./scenes/invoices";
import Bar from "./scenes/bar";
import UserManager from "./scenes/users";
import Geography from "./scenes/geography";
import Calendar from "./scenes/calendar/calendar";
import BookingForm from "./scenes/booking";
import RoomManager from "./scenes/room";
import AdminReports from "./scenes/Reports";
import Login from "./scenes/login";
import { AuthProvider } from "./Context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";
import Layout from "./components/layout/Layout";
import InvoiceForm from "./components/Invoice/InvoiceForm";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);

  return (
    <AuthProvider>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<PrivateRoute />}>
              <Route element={<Layout isSidebar={isSidebar} setIsSidebar={setIsSidebar} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/user" element={<UserManager />} />
                <Route path="/bar" element={<Bar />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/geography" element={<Geography />} />
                <Route path="/booking" element={<BookingForm />} />
                <Route path="/invoice" element={<InvoiceForm />} />
                <Route path="/room" element={<RoomManager />} />
                <Route path="/report" element={<AdminReports />} />
              </Route>
            </Route>
          </Routes>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AuthProvider>
  );
}

export default App;
