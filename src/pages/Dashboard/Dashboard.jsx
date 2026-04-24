import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Package, Users, AlertTriangle } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import StatCard from '../../components/StatCard';
import { formatCurrency } from '../../utils/formatters';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { shopSettings } = useShop();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: 0,
    lowStockCount: 0,
    debtorsCount: 0,
    totalInventoryValue: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Sales (Filter by date in JS to avoid index requirements)
    const qSales = query(
      collection(db, 'sales'),
      where('ownerId', '==', user.uid)
    );
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const allSales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter today's sales in memory
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const todaySalesList = allSales.filter(s => new Date(s.createdAt) >= startOfToday);
      const totalToday = todaySalesList.reduce((sum, s) => sum + (s.total || 0), 0);
      
      setStats(prev => ({ ...prev, todaySales: totalToday }));
      setRecentSales(allSales.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5));
    }, (error) => {
      console.error("Dashboard Sales Error:", error);
    });

    // 2. Fetch Low Stock Alerts
    const qProducts = query(
      collection(db, 'products'),
      where('ownerId', '==', user.uid)
    );
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const lowStock = products.filter(p => p.stock <= p.minStock);
      const totalVal = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
      setStats(prev => ({ 
        ...prev, 
        lowStockCount: lowStock.length,
        totalInventoryValue: totalVal 
      }));
      setLowStockProducts(lowStock.slice(0, 5));
    });

    // 3. Fetch Debtors
    const qCustomers = query(
      collection(db, 'customers'),
      where('ownerId', '==', user.uid),
      where('debtBalance', '>', 0)
    );
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      setStats(prev => ({ ...prev, debtorsCount: snapshot.docs.length }));
    });

    return () => {
      unsubSales();
      unsubProducts();
      unsubCustomers();
    };
  }, [user]);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Resumen de {shopSettings.shopName}</h1>
        <p>{shopSettings.shopSlogan || 'Bienvenido de nuevo. Aquí tienes un vistazo de tu negocio.'}</p>
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Ventas de Hoy" 
          value={formatCurrency(stats.todaySales, shopSettings.currency)} 
          icon={<TrendingUp size={20} />} 
          trend={0} 
          trendLabel="hoy"
          color="var(--success)"
        />
        <StatCard 
          title="Productos en Alerta" 
          value={stats.lowStockCount.toString()} 
          icon={<AlertTriangle size={20} />} 
          color="var(--warning)"
        />
        <StatCard 
          title="Clientes con Deuda" 
          value={stats.debtorsCount.toString()} 
          icon={<Users size={20} />} 
          color="var(--primary-brand)"
        />
        <StatCard 
          title="Valor Inventario" 
          value={formatCurrency(stats.totalInventoryValue, shopSettings.currency)} 
          icon={<Package size={20} />} 
          color="#8b5cf6"
        />
      </div>

      <div className="dashboard-content">
        <div className="recent-sales-panel">
          <div className="panel-header">
            <h3>Últimas Ventas</h3>
            <button className="text-btn" onClick={() => navigate('/history')}>Ver todas</button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Artículos</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{sale.customerName}</td>
                    <td>{sale.items?.length || 0}</td>
                    <td><b>{formatCurrency(sale.total, shopSettings.currency)}</b></td>
                    <td>
                      <span className={sale.method === 'Fiado' ? 'badge-warning' : 'badge-success'}>
                        {sale.method === 'Fiado' ? 'Por Cobrar' : 'Pagado'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No hay ventas registradas hoy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="alerts-panel">
          <div className="panel-header">
            <h3>Alertas de Inventario</h3>
          </div>
          <div className="alerts-list">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="alert-item">
                <div className="alert-icon"><Package size={16} /></div>
                <div className="alert-text">
                  <strong>{product.name}</strong>
                  <span>Quedan {product.stock} unidades en stock</span>
                </div>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                Todo en orden. No hay alertas de stock.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
