import React from 'react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';

const statsCards = [
  { label: 'SAUDÁVEL', value: '78%', icon: '↑', iconColor: '#22c55e', progress: 78, progressColor: '#22c55e' },
  { label: 'ALERTAS ATIVOS', value: '5', icon: '⚠', iconColor: '#f59e0b', progress: null },
  { label: 'TALHÕES', value: '12', icon: '🗺', iconColor: '#3b82f6', progress: null },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar />

      <div className="scroll-area flex-1 page-enter">
        <div className="px-5 pt-5 pb-2">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Hanken Grotesk' }}>
            Olá, Produtor 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral da sua lavoura de morangos.</p>
        </div>

        {/* Stats Row */}
        <div className="px-5 pb-4">
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-0" style={{ scrollbarWidth: 'none' }}>
            {statsCards.map((card, i) => (
              <div key={i} className="flex-shrink-0 bg-white rounded-2xl p-4 border border-gray-100 card-hover"
                style={{ minWidth: 130, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-800">{card.value}</span>
                  <span style={{ color: card.iconColor }}>{card.icon}</span>
                </div>
                {card.progress !== null && (
                  <div className="progress-bar mt-2">
                    <div className="progress-fill" style={{ width: `${card.progress}%`, background: card.progressColor }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alert Banner */}
        <div className="mx-5 mb-4 rounded-2xl p-4 flex gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <span className="text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#c0222a' }}>Alerta de Manejo</p>
            <p className="text-sm text-gray-600 mt-0.5">Área 3 apresenta aumento de manchas foliares. Verificar manejo.</p>
          </div>
        </div>

        {/* Last Analysis Card */}
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden card-hover" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
          onClick={() => navigate('/resultado')}>
          <div className="relative h-44 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=80"
              alt="Strawberry leaves"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 40%, transparent)' }} />
            <div className="absolute top-3 left-3">
              <span className="text-xs font-bold text-white px-2 py-1 rounded-full" style={{ background: '#c0222a' }}>
                ÚLTIMA ANÁLISE
              </span>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white font-bold text-lg" style={{ fontFamily: 'Hanken Grotesk' }}>
                Possível deficiência nutricional
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>schedule</span>
                <p className="text-white text-xs opacity-80">Hoje, 10:45 AM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="px-5 mb-4">
          <button
            onClick={() => navigate('/analisar')}
            className="w-full py-4 flex items-center justify-center gap-2.5 text-white font-semibold text-base rounded-2xl btn-primary"
            style={{ background: '#c0222a' }}
          >
            <span className="material-symbols-outlined text-xl">photo_camera</span>
            Analisar planta
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="px-5 pb-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/mapa')}
            className="bg-white rounded-2xl p-5 flex flex-col items-center gap-2 card-hover border border-gray-100"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <span className="material-symbols-outlined" style={{ color: '#2d6a4f', fontSize: 24 }}>map</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">Mapa da lavoura</span>
          </button>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/historico')}
              className="bg-white rounded-2xl p-4 flex items-center gap-3 card-hover border border-gray-100"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            >
              <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 20 }}>history</span>
              <span className="text-sm font-semibold text-gray-700">Histórico</span>
            </button>
            <button
              onClick={() => navigate('/relatorios')}
              className="bg-white rounded-2xl p-4 flex items-center gap-3 card-hover border border-gray-100"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            >
              <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 20 }}>description</span>
              <span className="text-sm font-semibold text-gray-700">Relatórios</span>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
