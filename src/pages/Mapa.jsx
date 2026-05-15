import React, { useEffect, useRef, useState } from 'react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';
import { useLocation } from 'react-router-dom';

const Mapa = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const location = useLocation();
  const focusCoords = location.state?.focusCoords;
  
  // Estados para o menu de camadas
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayer, setActiveLayer] = useState('satelite');

  useEffect(() => {
    // Inicializa o mapa apenas se a div existir, o script do Leaflet estiver carregado e o mapa ainda não tiver sido criado
    if (mapRef.current && window.L && !mapInstanceRef.current) {
      // Coordenadas ajustadas para as grandes fazendas a oeste de Sorriso - MT (fora do centro urbano)
      const baseLat = -12.5200;
      const baseLng = -55.7800;

      const initialLat = focusCoords ? focusCoords.lat : baseLat;
      const initialLng = focusCoords ? focusCoords.lng : baseLng;

      const map = window.L.map(mapRef.current, {
        zoomControl: false // Desativamos o controle de zoom padrão para usar nosso botão customizado
      }).setView([initialLat, initialLng], focusCoords ? 17 : 14);
      
      mapInstanceRef.current = map;

      // Adiciona a camada de Satélite (Esri World Imagery)
      window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics'
      }).addTo(map);

      // Define um estilo para os talhões (polígonos)
      const talhaoStyle = {
        color: '#22c55e', // green-500
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.3
      };

      const talhaoRiscoStyle = {
        color: '#ef4444', // red-500
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.4
      };

      // Desenha o Talhão 2 (Saudável) em Sorriso-MT
      const talhao2 = window.L.polygon([
        [baseLat + 0.0025, baseLng + 0.0045],
        [baseLat + 0.0025, baseLng + 0.0095],
        [baseLat - 0.0005, baseLng + 0.0095],
        [baseLat - 0.0005, baseLng + 0.0045]
      ], talhaoStyle).addTo(map);
      talhao2.bindPopup("<b>Talhão 2</b><br>85% Saudável");

      // Desenha a Área de Risco
      const areaRisco = window.L.polygon([
        [baseLat - 0.0015, baseLng - 0.0035],
        [baseLat - 0.0015, baseLng + 0.0025],
        [baseLat - 0.0045, baseLng + 0.0025],
        [baseLat - 0.0045, baseLng - 0.0035]
      ], talhaoRiscoStyle).addTo(map);
      areaRisco.bindPopup("<b style='color:red'>Área de Risco</b><br>Alerta de pragas detectado!");

      // Adiciona marcadores (Pins) fixos da simulação
      const customIcon = window.L.divIcon({
        className: 'custom-pin',
        html: `<span class="material-symbols-outlined text-green-500 text-4xl" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5))">location_on</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      window.L.marker([baseLat + 0.0010, baseLng + 0.0070], { icon: customIcon }).addTo(map);

      // Se viemos da tela de análise, mostra o pino exato da investigação!
      if (focusCoords) {
        const focusIcon = window.L.divIcon({
          className: 'custom-focus-pin',
          html: `<span class="material-symbols-outlined text-blue-600 text-5xl" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.6)); animation: bounce 2s infinite;">location_on</span>`,
          iconSize: [48, 48],
          iconAnchor: [24, 48]
        });
        window.L.marker([focusCoords.lat, focusCoords.lng], { icon: focusIcon }).addTo(map)
          .bindPopup("<b style='color:#2563eb'>Investigação Salva</b><br>Local exato da foto").openPopup();
      } else {
        const customAlertIcon = window.L.divIcon({
          className: 'custom-pin-alert',
          html: `<span class="material-symbols-outlined text-red-500 text-4xl" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5))">location_on</span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });
        window.L.marker([baseLat - 0.0030, baseLng - 0.0005], { icon: customAlertIcon }).addTo(map);
      }
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Determina o filtro visual do mapa baseado na camada selecionada
  const getMapFilter = () => {
    switch(activeLayer) {
      case 'ndvi':
        // Filtro que simula câmera infravermelha / NDVI heatmap
        return 'contrast(1.5) saturate(2.5) hue-rotate(45deg)';
      case 'umidade':
        // Filtro que simula mapa de umidade (tons de azul e roxo escuro)
        return 'grayscale(80%) sepia(50%) hue-rotate(180deg) saturate(3) contrast(1.2)';
      case 'satelite':
      default:
        return 'none';
    }
  };

  const handleGPSClick = () => {
    if (!mapInstanceRef.current) return;

    const simulateGPS = () => {
      // Localização simulada dentro da fazenda para demonstração
      const fakeLat = -12.5220;
      const fakeLng = -55.7780;
      
      mapInstanceRef.current.flyTo([fakeLat, fakeLng], 16, { duration: 1.5 });
      
      const userIcon = window.L.divIcon({
        className: 'custom-user-pin',
        html: `<div style="width:16px; height:16px; background:#3b82f6; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(59,130,246,0.8); animation: pulse 2s infinite;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      
      window.L.marker([fakeLat, fakeLng], { icon: userIcon }).addTo(mapInstanceRef.current)
        .bindPopup("Você está aqui! (GPS Simulado)").openPopup();
    };

    // Tenta usar o GPS real do aparelho
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
          
          const userIcon = window.L.divIcon({
            className: 'custom-user-pin',
            html: `<div style="width:16px; height:16px; background:#3b82f6; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(59,130,246,0.8); animation: pulse 2s infinite;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          
          window.L.marker([lat, lng], { icon: userIcon }).addTo(mapInstanceRef.current)
            .bindPopup("Sua Localização Real").openPopup();
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            alert('Atenção: O acesso ao GPS foi negado no seu celular/navegador. Para usar a localização em tempo real, vá nas configurações do aparelho e permita o acesso à localização para este app.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert('Sinal de GPS indisponível no momento. Usando localização simulada.');
          } else if (error.code === error.TIMEOUT) {
            alert('Tempo esgotado ao buscar o GPS. Verifique seu sinal.');
          }
          console.warn('Erro no GPS real, usando simulação', error);
          simulateGPS();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      simulateGPS();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <TopBar title="Mapa da Lavoura" />

      <div className="flex-1 relative page-enter overflow-hidden">
        {/* Container Real do Mapa com filtro dinâmico para simular as camadas */}
        <div 
          ref={mapRef} 
          className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out"
          style={{ filter: getMapFilter() }}
        ></div>

        {/* Floating Actions on Map */}
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
          <div className="relative">
            <button 
              onClick={() => setShowLayers(!showLayers)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform border border-gray-100 ${showLayers ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700'}`}
            >
              <span className="material-symbols-outlined">layers</span>
            </button>
            
            {/* Layer Selection Menu */}
            {showLayers && (
              <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-gray-100 w-48 overflow-hidden z-20 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 border-b border-gray-50">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Camadas</h4>
                </div>
                <div className="flex flex-col">
                  <button onClick={() => changeLayer('satelite')} className={`px-4 py-3 text-sm text-left flex items-center gap-2 ${activeLayer === 'satelite' ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-700 active:bg-gray-50'}`}>
                    <span className="material-symbols-outlined text-base">satellite</span>
                    Satélite Real
                  </button>
                  <button onClick={() => changeLayer('ndvi')} className={`px-4 py-3 text-sm text-left flex items-center gap-2 ${activeLayer === 'ndvi' ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-700 active:bg-gray-50'}`}>
                    <span className="material-symbols-outlined text-base">grass</span>
                    Índice Vegetativo (NDVI)
                  </button>
                  <button onClick={() => changeLayer('umidade')} className={`px-4 py-3 text-sm text-left flex items-center gap-2 ${activeLayer === 'umidade' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 active:bg-gray-50'}`}>
                    <span className="material-symbols-outlined text-base">water_drop</span>
                    Umidade do Solo
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleGPSClick}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-700 active:scale-95 transition-transform border border-gray-100"
          >
            <span className="material-symbols-outlined text-blue-600">my_location</span>
          </button>
        </div>

        {/* Bottom Info Card */}
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg border border-gray-100 z-10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800" style={{ fontFamily: 'Hanken Grotesk' }}>Resumo da Área</h3>
            <span className="badge-critico">1 Alerta Ativo</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>grid_on</span>
              <span>12 Talhões</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-green-500" style={{ fontSize: 18 }}>eco</span>
              <span>85% Saudável</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
      `}} />

      <BottomNav />
    </div>
  );
};

export default Mapa;
