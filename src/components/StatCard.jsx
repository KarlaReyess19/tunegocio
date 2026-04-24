import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, icon, trend, trendLabel, color = 'var(--primary-brand)' }) => {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <div className="stat-body">
        <h2 className="stat-value">{value}</h2>
        {trend && (
          <div className="stat-trend">
            <span className={`trend-value ${trend > 0 ? 'positive' : 'negative'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            <span className="trend-label">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
