import React, { useState } from 'react';
import TopBar from '../components/TopBar';

const Equipe = () => {
  const [membros, setMembros] = useState([
    { id: 1, nome: 'João Silva', cargo: 'Agrônomo Chefe', status: 'Ativo' },
    { id: 2, nome: 'Maria Santos', cargo: 'Operadora de Máquinas', status: 'Ativo' },
    { id: 3, nome: 'Carlos Mendes', cargo: 'Técnico Agrícola', status: 'Férias' },
  ]);

  const adicionarMembro = () => {
    const nome = window.prompt('Qual o nome do novo membro da equipe?');
    if (!nome) return;
    
    const cargo = window.prompt(`Qual o cargo de ${nome}?`) || 'Auxiliar';
    
    const novoMembro = {
      id: Date.now(),
      nome,
      cargo,
      status: 'Ativo'
    };
    
    setMembros([...membros, novoMembro]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Gerenciar Equipe" showBack={true} showBell={false} />
      <div className="scroll-area flex-1 page-enter p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Hanken Grotesk' }}>Membros ({membros.length})</h2>
          <button 
            onClick={adicionarMembro}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-sm hover:bg-green-700"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
            Adicionar
          </button>
        </div>
        
        <div className="space-y-3">
          {membros.map(membro => (
            <div key={membro.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {membro.nome.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{membro.nome}</h3>
                  <p className="text-xs text-gray-500">{membro.cargo}</p>
                </div>
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded-md ${membro.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {membro.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Equipe;
