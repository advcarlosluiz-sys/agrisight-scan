import React from 'react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';

const Perfil = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Simulando logout
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Meu Perfil" />

      <div className="scroll-area flex-1 page-enter">
        {/* Header Profile */}
        <div className="bg-white pt-6 pb-8 px-5 flex flex-col items-center border-b border-gray-100">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-4 relative">
            <span className="text-4xl text-red-600 font-bold">P</span>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center border-2 border-white text-white">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Hanken Grotesk' }}>Produtor Rural</h2>
          <p className="text-sm text-gray-500">produtor@fazenda.com</p>
          <div className="mt-3 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
            Conta Premium
          </div>
        </div>

        {/* Settings List */}
        <div className="p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Configurações da Fazenda</p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <button onClick={() => navigate('/dados-propriedade')} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>business</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">Dados da Propriedade</span>
              </div>
              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
            </button>
            <button onClick={() => navigate('/equipe')} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>group</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">Gerenciar Equipe</span>
              </div>
              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
            </button>
            <button onClick={() => navigate('/notificacoes-config')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">Notificações</span>
              </div>
              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
            </button>
          </div>

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Suporte & Mais</p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <button onClick={() => navigate('/ajuda')} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>help_center</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">Central de Ajuda</span>
              </div>
              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors active:bg-red-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                </div>
                <span className="text-sm font-semibold text-red-600">Sair da Conta</span>
              </div>
            </button>
          </div>
          
          <p className="text-center text-xs text-gray-400 mb-4">Scanberry Versão 1.0.0</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Perfil;
