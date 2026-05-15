import React, { useState } from 'react';
import TopBar from '../components/TopBar';

const NotificacoesConfig = () => {
  const [alertas, setAlertas] = useState(true);
  const [relatorios, setRelatorios] = useState(false);
  const [sistema, setSistema] = useState(true);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Notificações" showBack={true} showBell={false} />
      <div className="scroll-area flex-1 page-enter p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'Hanken Grotesk' }}>Preferências</h2>
        
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div 
            className="p-4 border-b border-gray-50 flex items-center justify-between cursor-pointer active:bg-gray-50"
            onClick={() => setAlertas(!alertas)}
          >
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Alertas da Lavoura</h3>
              <p className="text-xs text-gray-500">Pragas, doenças e estresse hídrico</p>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${alertas ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none"></div>
            </div>
          </div>
          
          <div 
            className="p-4 border-b border-gray-50 flex items-center justify-between cursor-pointer active:bg-gray-50"
            onClick={() => setRelatorios(!relatorios)}
          >
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Relatórios Semanais</h3>
              <p className="text-xs text-gray-500">Resumo da saúde da plantação</p>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${relatorios ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none"></div>
            </div>
          </div>

          <div 
            className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50"
            onClick={() => setSistema(!sistema)}
          >
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Atualizações do Sistema</h3>
              <p className="text-xs text-gray-500">Novos recursos e manutenções</p>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${sistema ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificacoesConfig;
