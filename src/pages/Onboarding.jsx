import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const slides = [
  {
    icon: '📸',
    title: 'Capture e Analise',
    description: 'Tire uma foto da planta e nossa IA identifica doenças, pragas e deficiências nutricionais em segundos.',
    color: '#fef2f2',
    accent: '#c0222a',
  },
  {
    icon: '🗺️',
    title: 'Mapeie sua Lavoura',
    description: 'Visualize talhões no mapa interativo e acompanhe a saúde de cada área com alertas em tempo real.',
    color: '#f0fdf4',
    accent: '#2d6a4f',
  },
  {
    icon: '💡',
    title: 'Recomendações com IA',
    description: 'Receba orientações técnicas precisas para correção de irrigação, nutrição e manejo fitossanitário.',
    color: '#fffbeb',
    accent: '#92400e',
  },
];

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      navigate('/login');
    }
  };

  const skip = () => navigate('/login');
  const slide = slides[current];

  return (
    <div className="flex flex-col h-full" style={{ background: slide.color, transition: 'background 0.4s ease' }}>
      {/* Skip */}
      <div className="flex justify-end px-6 pt-12 pb-4">
        <button onClick={skip} className="text-sm text-gray-400 font-medium">
          Pular
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center onboard-content" key={current}>
        <div className="text-8xl mb-8">{slide.icon}</div>
        <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Hanken Grotesk', color: '#1b1c1c' }}>
          {slide.title}
        </h2>
        <p className="text-base text-gray-500 leading-relaxed max-w-xs">
          {slide.description}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-6 pb-12">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 28 : 8,
                height: 8,
                background: i === current ? slide.accent : '#d1d5db',
              }}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={next}
          className="w-full py-4 text-white font-semibold text-base rounded-full btn-primary"
          style={{ background: slide.accent }}
        >
          {current < slides.length - 1 ? 'Próximo' : 'Começar'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
