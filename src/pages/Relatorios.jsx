import React from 'react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

const Relatorios = () => {
  const handleDownload = () => {
    // Gerar um conteúdo de texto com os dados da tela para simular o relatório
    const conteudoRelatorio = `
SCANBERRY - RELATÓRIO MENSAL DA LAVOURA
=======================================
Data: ${new Date().toLocaleDateString('pt-BR')}

RESUMO GERAL
- Análises Realizadas: 45
- Problemas Detectados: 12
- Saúde da Lavoura: +5% vs. Mês Passado

STATUS DAS ÚLTIMAS SEMANAS
- Semana 1: Saudável
- Semana 2: Saudável
- Semana 3: Alerta de Pragas
- Semana 4: Recuperação

Gerado automaticamente por BerryGrow AI.
`;

    // Criar um Blob com o texto
    const blob = new Blob([conteudoRelatorio], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Criar um link invisível para forçar o download no navegador
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Relatorio_Lavoura_Scanberry.txt';
    document.body.appendChild(a);
    a.click();
    
    // Limpar o link após o clique
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Relatórios" showBack />

      <div className="scroll-area flex-1 page-enter p-5">
        <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Hanken Grotesk' }}>Resumo Mensal</h2>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="material-symbols-outlined text-blue-500 mb-2">analytics</span>
            <p className="text-2xl font-bold text-gray-800">45</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Análises Realizadas</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="material-symbols-outlined text-red-500 mb-2">warning</span>
            <p className="text-2xl font-bold text-gray-800">12</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Problemas Detectados</p>
          </div>
        </div>

        {/* Mock Chart Area */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 text-sm">Saúde da Lavoura</h3>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">+5% vs. Mês Passado</span>
          </div>
          
          <div className="flex items-end gap-2 h-32 mt-4 pt-4 border-t border-gray-100">
            {/* Bars */}
            <div className="flex-1 flex flex-col justify-end gap-1">
              <div className="bg-green-400 w-full rounded-t-sm" style={{ height: '60%' }}></div>
              <span className="text-[10px] text-gray-400 text-center">Sem 1</span>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-1">
              <div className="bg-green-400 w-full rounded-t-sm" style={{ height: '80%' }}></div>
              <span className="text-[10px] text-gray-400 text-center">Sem 2</span>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-1">
              <div className="bg-red-400 w-full rounded-t-sm" style={{ height: '40%' }}></div>
              <span className="text-[10px] text-gray-400 text-center">Sem 3</span>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-1">
              <div className="bg-green-500 w-full rounded-t-sm" style={{ height: '90%' }}></div>
              <span className="text-[10px] text-gray-400 text-center">Sem 4</span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button 
          onClick={handleDownload}
          className="w-full py-4 text-white font-semibold text-base rounded-2xl btn-primary flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">download</span>
          Exportar Relatório (TXT)
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Relatorios;
