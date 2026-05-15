import React, { useState } from 'react';
import TopBar from '../components/TopBar';

const DadosPropriedade = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [dados, setDados] = useState({
    cnpj: '12.345.678/0001-90',
    area: '1.250',
    local: 'Rodovia BR-163, Km 120, Sorriso - MT'
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Dados da Propriedade" showBack={true} showBell={false} />
      <div className="scroll-area flex-1 page-enter p-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'Hanken Grotesk' }}>Fazenda Esperança</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CNPJ / Produtor Rural</label>
              {isEditing ? (
                <input type="text" value={dados.cnpj} onChange={(e) => setDados({...dados, cnpj: e.target.value})} className="w-full bg-white p-3 rounded-lg text-gray-800 font-medium border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200" />
              ) : (
                <div className="w-full bg-gray-50 p-3 rounded-lg text-gray-800 font-medium border border-gray-200">
                  {dados.cnpj}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Área Total (Hectares)</label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input type="number" value={dados.area} onChange={(e) => setDados({...dados, area: e.target.value})} className="w-full bg-white p-3 rounded-lg text-gray-800 font-medium border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200" />
                  <span className="text-gray-500 font-bold">ha</span>
                </div>
              ) : (
                <div className="w-full bg-gray-50 p-3 rounded-lg text-gray-800 font-medium border border-gray-200">
                  {dados.area} ha
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Localização</label>
              {isEditing ? (
                <input type="text" value={dados.local} onChange={(e) => setDados({...dados, local: e.target.value})} className="w-full bg-white p-3 rounded-lg text-gray-800 font-medium border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200" />
              ) : (
                <div className="w-full bg-gray-50 p-3 rounded-lg text-gray-800 font-medium border border-gray-200">
                  {dados.local}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`w-full py-3 mt-4 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all ${isEditing ? 'bg-green-600 text-white shadow-md' : 'bg-red-50 text-red-600 border border-red-100'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{isEditing ? 'save' : 'edit'}</span>
              {isEditing ? 'Salvar Dados' : 'Editar Dados'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DadosPropriedade;
