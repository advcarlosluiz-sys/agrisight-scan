import React from 'react';
import TopBar from '../components/TopBar';

const Ajuda = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Central de Ajuda" showBack={true} showBell={false} />
      <div className="scroll-area flex-1 page-enter p-5">
        
        <div className="bg-green-600 text-white rounded-2xl p-6 shadow-md mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Hanken Grotesk' }}>Como podemos ajudar?</h2>
            <p className="text-green-100 text-sm mb-4">Nossa equipe de suporte agronômico está à disposição.</p>
            <button onClick={() => alert('Abrindo chat com agrônomo...')} className="bg-white text-green-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm active:scale-95 transition-transform">
              Falar com Suporte
            </button>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-green-500 opacity-50" style={{ fontSize: 120 }}>support_agent</span>
        </div>

        <h3 className="text-sm font-bold text-gray-800 mb-3 ml-1">Dúvidas Frequentes</h3>
        
        <div className="space-y-3">
          <div onClick={() => alert('Passo 1: Vá na tela Analisar...\nPasso 2: Tire uma foto da folha.')} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Como registrar uma nova análise?</span>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </div>
          <div onClick={() => alert('Verde significa saudável.\nAmarelo requer atenção.\nVermelho é risco de praga.')} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Entendendo os relatórios de saúde</span>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </div>
          <div onClick={() => alert('Acesse as configurações do sensor e escaneie o QRCode.')} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Como conectar sensores IoT?</span>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ajuda;
