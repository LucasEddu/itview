import React from 'react';
import { motion } from 'framer-motion';

const ChartContainer = ({ title, children }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="glass-card"
      style={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}
    >
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        {children}
      </div>
    </motion.div>
  );
};

export default ChartContainer;
