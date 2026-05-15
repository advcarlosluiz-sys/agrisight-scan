import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Resultado = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const coords = location.state?.coords;
  const aiResult = location.state?.aiResult;
  const imageSrc = location.state?.imageSrc;
  
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    const newItem = {
      id: Date.now(),
      title: aiResult?.titulo || 'Diagnóstico (IA)',
      location: coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Fazenda Sorriso (Simulado)',
      date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      status: aiResult?.gravidade === 'Alta' ? 'crítico' : aiResult?.gravidade === 'Média' ? 'alerta' : 'bom',
      image: imageSrc || 'https://images.unsplash.com/photo-1565234141547-b1cd3e2d2a27?w=150&q=80',
      coords: coords // Salva as coordenadas
    };

    // Tenta salvar na nuvem (Supabase)
    if (supabase) {
      try {
        const { error } = await supabase.from('historico').insert([
          {
            title: newItem.title,
            location: newItem.location,
            status: newItem.status,
            image_url: newItem.image,
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null
          }
        ]);
        
        if (error) {
          console.warn("Erro ao salvar no Supabase, usando armazenamento local.", error);
          saveLocally(newItem);
        } else {
          console.log("Salvo no Supabase com sucesso!");
        }
      } catch (err) {
        console.error("Falha na conexão, usando armazenamento local.", err);
        saveLocally(newItem);
      }
    } else {
      // Fallback inteligente: se as chaves do Supabase ainda não foram colocadas no .env
      console.log("Supabase não configurado. Salvando localmente.");
      saveLocally(newItem);
    }

    setSaved(true);
    setIsSaving(false);
    setTimeout(() => navigate('/historico'), 1200);
  };

  const saveLocally = (item) => {
    const savedHistory = localStorage.getItem('@ScanBerry:historico');
    let history = savedHistory ? JSON.parse(savedHistory) : [];
    history.unshift(item);
    localStorage.setItem('@ScanBerry:historico', JSON.stringify(history));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Resultado da IA" showBack />

      <div className="scroll-area flex-1 page-enter">
        {/* Image with overlay badge */}
        <div className="relative mx-5 mt-4 rounded-2xl overflow-hidden" style={{ height: 200 }}>
          <img
            src={imageSrc || "https://images.unsplash.com/photo-1565234141547-b1cd3e2d2a27?w=400&q=80"}
            alt="Analyzed leaf"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}>
              <span className="material-symbols-outlined text-green-600" style={{ fontSize: 16 }}>photo_camera</span>
              <span className="text-sm font-semibold text-gray-700">IA processada com sucesso</span>
            </div>
          </div>
        </div>

        {/* Diagnosis header */}
        <div className="mx-5 mt-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange-500 text-lg">⚠️</span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#c0222a' }}>
              Diagnóstico Detectado
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Hanken Grotesk' }}>
            {aiResult?.titulo || 'Possível deficiência de cálcio'}
          </h2>
        </div>

        {/* Confidence & Severity */}
        <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <span className="material-symbols-outlined text-gray-400 block mb-1" style={{ fontSize: 24 }}>ssid_chart</span>
            <p className="text-xs text-gray-400 mb-1">Confiança</p>
            <p className="text-xl font-bold" style={{ color: '#c0222a' }}>{aiResult?.confianca || 82}%</p>
            <div className="progress-bar mt-2">
              <div className="progress-fill" style={{ width: `${aiResult?.confianca || 82}%`, background: '#c0222a' }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <span className="material-symbols-outlined text-orange-400 block mb-1" style={{ fontSize: 24 }}>warning</span>
            <p className="text-xs text-gray-400 mb-1">Gravidade</p>
            <p className="text-xl font-bold text-orange-500">{aiResult?.gravidade || 'Média'}</p>
          </div>
        </div>

        {/* Location - Mostrando as coordenadas REAIS capturadas durante a foto */}
        <div className="mx-5 mb-4 bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-green-600" style={{ fontSize: 20 }}>location_on</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Localização do Registro</p>
              {coords ? (
                <p className="text-xs font-semibold text-gray-700 font-mono">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              ) : (
                <p className="text-xs font-semibold text-gray-700">Fazenda Sorriso (Simulado)</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/mapa', { state: { focusCoords: coords } })}
            className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-50 active:bg-gray-100" style={{ color: '#2d6a4f' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>map</span>
            Mapa
          </button>
        </div>

        {/* Recommendation */}
        <div className="mx-5 mb-4 rounded-2xl p-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined" style={{ color: '#c0222a', fontSize: 20 }}>lightbulb</span>
            <p className="text-sm font-bold" style={{ color: '#c0222a' }}>Recomendação Especializada</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {aiResult?.recomendacao || 'Verificar irrigação, pH do solo e equilíbrio nutricional. Considerar orientação agronômica antes de aplicar fertilizantes.'}
          </p>
        </div>

        {/* Possible causes */}
        <div className="mx-5 mb-4 bg-white rounded-2xl p-4 border border-gray-100"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p className="text-sm font-bold text-gray-700 mb-3">Possíveis causas</p>
          {(aiResult?.causas || ['pH do solo abaixo de 6.0', 'Excesso de potássio ou magnésio', 'Estresse hídrico recente']).map((cause, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#c0222a' }} />
              <p className="text-sm text-gray-600">{cause}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-4 flex flex-col gap-3">
          <button
            onClick={handleSave}
            className="w-full py-4 flex items-center justify-center gap-2 text-white font-semibold rounded-2xl btn-primary"
            style={{ background: saved ? '#22c55e' : '#c0222a' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {saved ? 'check_circle' : 'save'}
            </span>
            {saved ? 'Ocorrência salva!' : 'Salvar ocorrência'}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/historico')}
              className="py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-2xl border border-gray-300 text-gray-600 bg-white"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>history</span>
              Histórico
            </button>
            <button
              onClick={() => alert('Suas análises foram enviadas para o engenheiro agrônomo parceiro. Ele entrará em contato em breve!')}
              className="py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-2xl btn-green active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
              Agrônomo
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Resultado;
