import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/home', icon: 'home', label: 'Início' },
  { to: '/analisar', icon: 'biotech', label: 'Analisar' },
  { to: '/mapa', icon: 'map', label: 'Mapa' },
  { to: '/historico', icon: 'history', label: 'Histórico' },
  { to: '/perfil', icon: 'person', label: 'Perfil' },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="flex-shrink-0 bg-white border-t border-gray-100 safe-bottom"
      style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon, label }) => {
          const isActive = location.pathname === to || (to === '/analisar' && location.pathname === '/resultado');
          return (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${isActive ? 'bg-green-100' : ''}`}>
                <span
                  className={`material-symbols-outlined text-2xl transition-colors duration-200 ${isActive ? 'filled' : ''}`}
                  style={{ color: isActive ? '#2d6a4f' : '#9ca3af', fontSize: '22px' }}
                >
                  {icon}
                </span>
                <span
                  className="text-xs font-semibold transition-colors duration-200"
                  style={{ color: isActive ? '#2d6a4f' : '#9ca3af', fontSize: '10px' }}
                >
                  {label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
