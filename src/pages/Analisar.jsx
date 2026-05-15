import React, { useState, useRef } from 'react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { analyzePlantImage } from '../lib/geminiClient';

const scanModes = [
  { id: 'folha', icon: 'eco', label: 'Folha' },
  { id: 'fruto', icon: 'yard', label: 'Fruto' },
  { id: 'flor', icon: 'local_florist', label: 'Flor' },
  { id: 'raiz', icon: 'device_hub', label: 'Raiz' },
];

const Analisar = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState('folha');
  const [analyzing, setAnalyzing] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [coords, setCoords] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef();

  // Busca o GPS assim que a tela de Análise é aberta
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        (err) => console.warn("GPS não capturado na análise", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const handleFileChange = (e) => {
    setErrorMsg('');
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImageSrc(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageSrc) {
      setErrorMsg("Por favor, capture ou envie uma imagem primeiro.");
      return;
    }

    setAnalyzing(true);
    setErrorMsg('');

    const result = await analyzePlantImage(imageSrc);
    setAnalyzing(false);

    if (result.error) {
      setErrorMsg(result.error);
      return;
    }

    if (!result.valido) {
      setErrorMsg(result.mensagem || "Imagem inválida. Por favor, aponte para uma planta.");
      return;
    }

    // Se válido, passa os dados da IA e as coordenadas para a tela de resultado
    navigate('/resultado', { state: { coords, aiResult: result, imageSrc } });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <TopBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Camera/Preview area */}
        <div className="relative flex-1 overflow-hidden map-container" style={{ background: '#111' }}>
          {imageSrc ? (
            <img src={imageSrc} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?w=400&q=80"
              alt="Camera preview"
              className="w-full h-full object-cover opacity-80"
            />
          )}

          {/* GPS Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}>
              <span className="material-symbols-outlined filled text-green-600" style={{ fontSize: 16 }}>my_location</span>
              <span className="text-sm font-semibold text-gray-700">GPS ativo</span>
            </div>
          </div>

          {/* Scan Frame */}
          <div className="absolute inset-8 flex items-center justify-center pointer-events-none">
            <div className="relative w-full max-w-xs aspect-square">
              {/* Corner brackets */}
              {['tl', 'tr', 'bl', 'br'].map(corner => (
                <div key={corner} className="absolute w-7 h-7"
                  style={{
                    top: corner.startsWith('t') ? 0 : 'auto',
                    bottom: corner.startsWith('b') ? 0 : 'auto',
                    left: corner.endsWith('l') ? 0 : 'auto',
                    right: corner.endsWith('r') ? 0 : 'auto',
                    borderTop: corner.startsWith('t') ? '3px solid #c0222a' : 'none',
                    borderBottom: corner.startsWith('b') ? '3px solid #c0222a' : 'none',
                    borderLeft: corner.endsWith('l') ? '3px solid #c0222a' : 'none',
                    borderRight: corner.endsWith('r') ? '3px solid #c0222a' : 'none',
                    borderRadius: corner === 'tl' ? '4px 0 0 0' : corner === 'tr' ? '0 4px 0 0' : corner === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
                  }}
                />
              ))}
              {/* Scan line */}
              {!imageSrc && (
                <div className="absolute left-0 right-0 h-0.5 scan-line" style={{ background: 'rgba(192, 34, 42, 0.7)' }} />
              )}
              {/* Label */}
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <p className="text-white text-sm font-medium drop-shadow"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  Aponte para uma folha, fruto ou flor
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom sheet */}
        <div className="bg-white rounded-t-3xl px-5 pt-5 pb-4 flex-shrink-0">
          {/* Mode chips */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: 'none' }}>
            {scanModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200"
                style={{
                  background: selectedMode === mode.id ? '#dcfce7' : '#f3f4f6',
                  color: selectedMode === mode.id ? '#2d6a4f' : '#6b7280',
                  border: selectedMode === mode.id ? '1.5px solid #86efac' : '1.5px solid transparent',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>

          {/* Camera button */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="pulse-ring absolute inset-0 rounded-full" style={{ background: 'rgba(192, 34, 42, 0.15)' }} />
              <button
                onClick={() => fileRef.current?.click()}
                className="relative w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: '#c0222a' }}
              >
                <span className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>photo_camera</span>
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
              <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>error</span>
              <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-4 flex items-center justify-center gap-2.5 text-white font-semibold text-base rounded-2xl btn-primary"
            style={{ background: '#c0222a' }}
          >
            {analyzing ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analisando com IA...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>smart_toy</span>
                Analisar com IA
              </>
            )}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Analisar;
