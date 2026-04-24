import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ShopProvider } from "./context/ShopContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Inventory from "./pages/Inventory/Inventory";
import POS from "./pages/POS/POS";
import Customers from "./pages/Customers/Customers";
import SalesHistory from "./pages/SalesHistory/SalesHistory";
import Settings from "./pages/Settings/Settings";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";

function App() {
  return (
    <AuthProvider>
      <ShopProvider>
        <Router>
        <div className="app-container">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected App Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="pos" element={<POS />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customers" element={<Customers />} />
              <Route path="history" element={<SalesHistory />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </div>
      </Router>
      </ShopProvider>
    </AuthProvider>
  );
}


export default App;
