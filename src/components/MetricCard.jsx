import React from 'react';
import { motion } from 'framer-motion';

const MetricCard = ({ label, value, icon: Icon, color }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="metric-label">{label}</span>
        <div style={{ 
          padding: '0.5rem', 
          borderRadius: '0.75rem', 
          backgroundColor: `${color}15`, 
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        KPI de Atendimento
      </div>
    </motion.div>
  );
};

export default MetricCard;
