import React, { useState, useEffect } from 'react';
import { Store, Globe, Shield, Bell, Save, CheckCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('negocio');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shopSettings, setShopSettings] = useState({
    shopName: '',
    shopSlogan: '',
    currency: 'L',
    taxRate: 15,
    language: 'es'
  });

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setShopSettings(docSnap.data());
        } else {
          // Default name based on email
          setShopSettings(prev => ({
            ...prev,
            shopName: `Negocio de ${user.email.split('@')[0]}`
          }));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await setDoc(doc(db, 'settings', user.uid), shopSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Cargando configuración...</div>;

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Configuración</h1>
        <p>Administra la información y preferencias de tu negocio.</p>
      </div>

      <div className="settings-container">
        <div className="settings-tabs">
          <div 
            className={`tab ${activeTab === 'negocio' ? 'active' : ''}`} 
            onClick={() => setActiveTab('negocio')}
          >
            <Store size={18} /> Negocio
          </div>
          <div 
            className={`tab ${activeTab === 'preferencias' ? 'active' : ''}`} 
            onClick={() => setActiveTab('preferencias')}
          >
            <Globe size={18} /> Preferencias
          </div>
          <div 
            className={`tab ${activeTab === 'seguridad' ? 'active' : ''}`} 
            onClick={() => setActiveTab('seguridad')}
          >
            <Shield size={18} /> Seguridad
          </div>
          <div 
            className={`tab ${activeTab === 'notificaciones' ? 'active' : ''}`} 
            onClick={() => setActiveTab('notificaciones')}
          >
            <Bell size={18} /> Notificaciones
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          {activeTab === 'negocio' && (
            <section className="settings-section">
              <h3>Perfil del Negocio</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre del Negocio</label>
                  <input 
                    type="text" 
                    value={shopSettings.shopName}
                    onChange={(e) => setShopSettings({...shopSettings, shopName: e.target.value})}
                    placeholder="Ej. Tienda La Bendición" 
                  />
                </div>
                <div className="form-group">
                  <label>Eslogan o Subtítulo</label>
                  <input 
                    type="text" 
                    value={shopSettings.shopSlogan}
                    onChange={(e) => setShopSettings({...shopSettings, shopSlogan: e.target.value})}
                    placeholder="Ej. Los mejores precios siempre" 
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'negocio' && (
            <section className="settings-section">
              <h3>Finanzas y Moneda</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Moneda Símbolo</label>
                  <select 
                    value={shopSettings.currency}
                    onChange={(e) => setShopSettings({...shopSettings, currency: e.target.value})}
                  >
                    <option value="L">Lempiras (L)</option>
                    <option value="$">Dólares ($)</option>
                    <option value="€">Euros (€)</option>
                    <option value="Q">Quetzales (Q)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Impuesto (ISV/IVA) %</label>
                  <input 
                    type="number" 
                    value={shopSettings.taxRate}
                    onChange={(e) => setShopSettings({...shopSettings, taxRate: e.target.value})}
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'preferencias' && (
            <section className="settings-section">
              <h3>Preferencias del Sistema</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Idioma</label>
                  <select 
                    value={shopSettings.language}
                    onChange={(e) => setShopSettings({...shopSettings, language: e.target.value})}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'seguridad' && (
            <section className="settings-section">
              <h3>Seguridad de la Cuenta</h3>
              <div className="account-info">
                <p><strong>Correo vinculado:</strong> {user?.email}</p>
                <p><strong>ID de Usuario:</strong> {user?.uid}</p>
                <button type="button" className="btn-outline" style={{ marginTop: '1rem' }}>
                  Cambiar Contraseña
                </button>
              </div>
            </section>
          )}

          {activeTab === 'notificaciones' && (
            <section className="settings-section">
              <h3>Notificaciones</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Esta funcionalidad estará disponible próximamente.</p>
            </section>
          )}

          <div className="settings-actions">
            {success && <span className="save-success"><CheckCircle size={16} /> ¡Cambios guardados!</span>}
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
