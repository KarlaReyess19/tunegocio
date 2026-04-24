import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, LogOut, Settings, Package, AlertTriangle, Wallet, CreditCard, CheckCircle, Menu } from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Notifications Logic
  React.useEffect(() => {
    if (!user) return;

    // 1. Listen for Low/Out of Stock
    const qStock = query(collection(db, 'products'), where('ownerId', '==', user.uid));
    const unsubscribeStock = onSnapshot(qStock, (snap) => {
      const stockAlerts = snap.docs
        .map(d => d.data())
        .filter(p => (p.stock || 0) <= (p.minStock || 5))
        .map(p => ({
          id: `stock-${p.name}`,
          type: 'stock',
          title: (p.stock || 0) === 0 ? 'Agotado' : 'Stock bajo',
          message: `${p.name} tiene ${(p.stock || 0)} unidades`,
          icon: p.stock === 0 ? <Package size={16} /> : <AlertTriangle size={16} />,
          severity: p.stock === 0 ? 'danger' : 'warning'
        }));
      setNotifications(prev => [...prev.filter(n => n.type !== 'stock'), ...stockAlerts]);
    });

    // 2. Listen for Pending Debts
    const qDebts = query(collection(db, 'customers'), where('ownerId', '==', user.uid), where('debtBalance', '>', 0));
    const unsubscribeDebts = onSnapshot(qDebts, (snap) => {
      const debtAlerts = snap.docs.map(d => ({
        id: `debt-${d.id}`,
        type: 'debt',
        title: 'Fiado pendiente',
        message: `${d.data().name} tiene saldo pendiente`,
        icon: <Wallet size={16} />,
        severity: 'info'
      }));
      setNotifications(prev => [...prev.filter(n => n.type !== 'debt'), ...debtAlerts]);
    });

    return () => {
      unsubscribeStock();
      unsubscribeDebts();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  return (
    <header className="main-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <div className="header-brand-placeholder"></div>
      </div>
      
      <div className="header-actions">
        <div className="notifications-container">
          <button 
            className={`icon-btn ${isNotificationsOpen ? 'active' : ''}`}
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          >
            <Bell size={20} />
            {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
          </button>
          
          {isNotificationsOpen && (
            <div className="notifications-dropdown">
              <div className="dropdown-header">
                <h4>Notificaciones</h4>
                <span className="count">{notifications.length}</span>
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">
                    <CheckCircle size={32} />
                    <p>No hay novedades</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${n.severity}`}>
                      <div className="notification-icon">{n.icon}</div>
                      <div className="notification-content">
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-profile-container">
          <div className="user-profile" onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <div className="avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.email?.split('@')[0]}</span>
              <span className="user-role">Administrador</span>
            </div>
          </div>
          
          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-item" onClick={() => {
                navigate('/settings');
                setIsProfileOpen(false);
              }}>
                <Settings size={18} />
                <span>Configuración</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item text-danger" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
