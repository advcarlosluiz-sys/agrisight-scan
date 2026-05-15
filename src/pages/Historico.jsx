import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const mockData = [
  {
    id: 1,
    title: 'Deficiência de Cálcio',
    location: 'Talhão 2, Linha 4',
    date: 'Hoje, 10:45',
    status: 'crítico',
    image: 'https://images.unsplash.com/photo-1565234141547-b1cd3e2d2a27?w=150&q=80'
  },
  {
    id: 2,
    title: 'Planta Saudável',
    location: 'Talhão 1, Linha 12',
    date: 'Ontem, 15:30',
    status: 'saudavel',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=150&q=80'
  },
  {
    id: 3,
    title: 'Mancha Foliar',
    location: 'Talhão 3, Linha 2',
    date: '12 de Maio, 09:15',
    status: 'alerta',
    image: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=150&q=80'
  }
];

const Historico = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('historico')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          if (data && data.length > 0) {
            // Mapeando dados do banco para o formato do app
            const mappedData = data.map(item => ({
              id: item.id,
              title: item.title,
              location: item.location,
              status: item.status,
              image: item.image_url || 'https://images.unsplash.com/photo-1565234141547-b1cd3e2d2a27?w=150&q=80',
              date: new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
              coords: (item.lat && item.lng) ? { lat: item.lat, lng: item.lng } : null
            }));
            setHistory(mappedData);
          } else {
            loadLocalData();
          }
        } catch (err) {
          console.error("Erro ao buscar do Supabase, usando local.", err);
          loadLocalData();
        }
      } else {
        loadLocalData();
      }
      setLoading(false);
    }
    
    loadData();
  }, []);

  const loadLocalData = () => {
    // Carrega do armazenamento local do celular
    const saved = localStorage.getItem('@ScanBerry:historico');
    if (saved) {
      setHistory(JSON.parse(saved));
    } else {
      // Se estiver vazio, popula com os dados de demonstração
      localStorage.setItem('@ScanBerry:historico', JSON.stringify(mockData));
      setHistory(mockData);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Histórico de Análises" />

      <div className="scroll-area flex-1 page-enter px-5 pt-4 pb-4">
        {/* Filter/Search */}
        <div className="mb-5 flex gap-2">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 20 }}>search</span>
            <input 
              type="text" 
              placeholder="Buscar análises..." 
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <button className="bg-white border border-gray-200 rounded-xl w-11 h-11 flex items-center justify-center text-gray-600">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>tune</span>
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
          {history.length === 0 && (
            <p className="text-center text-gray-500 mt-10">Nenhum registro encontrado.</p>
          )}
          {history.map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                if (item.coords) {
                  navigate('/mapa', { state: { focusCoords: item.coords } });
                }
              }}
              className="bg-white rounded-2xl p-3 flex gap-3 border border-gray-100 card-hover cursor-pointer" 
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                {item.coords && (
                  <div className="absolute bottom-1 right-1 bg-white/90 rounded-full p-0.5">
                    <span className="material-symbols-outlined text-blue-500 block" style={{ fontSize: 14 }}>gps_fixed</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-800 text-sm">{item.title}</h3>
                  <span className={`material-symbols-outlined ${item.status === 'crítico' ? 'text-red-500' : item.status === 'saudavel' ? 'text-green-500' : 'text-orange-500'}`} style={{ fontSize: 18 }}>
                    {item.status === 'crítico' ? 'warning' : item.status === 'saudavel' ? 'check_circle' : 'error'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1 font-mono">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                  {item.location}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                  {item.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Historico;
