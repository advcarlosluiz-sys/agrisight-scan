import React from 'react';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ title, showBack = false, showBell = true }) => {
  const navigate = useNavigate();

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 safe-top"
      style={{ minHeight: 56 }}>
      <div className="flex items-center gap-2">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="mr-1 p-1 -ml-1">
            <span className="material-symbols-outlined text-gray-600">arrow_back</span>
          </button>
        ) : (
          <span style={{ fontSize: 20, color: '#c0222a' }}>🍓</span>
        )}
        <span className="font-bold text-base" style={{ fontFamily: 'Hanken Grotesk', color: '#c0222a' }}>
          {title || 'BerryGrow AI'}
        </span>
      </div>
      {showBell && (
        <button 
          onClick={() => alert('Você tem 1 novo alerta de manejo na área 3!')}
          className="relative p-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 22 }}>notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>
      )}
    </header>
  );
};

export default TopBar;
