import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 2800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f0faf3 0%, #ffffff 50%, #fef5f5 100%)' }}>
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #86efac, transparent)' }} />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #fca5a5, transparent)' }} />

      {/* Center Content */}
      <div className="flex flex-col items-center text-center z-10 splash-logo px-8">
        {/* Logo Card */}
        <div className="mb-6 p-6 bg-white rounded-3xl shadow-md border border-gray-100 flex items-center justify-center"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <img
            alt="Scanberry Logo"
            className="w-40 h-20 object-contain"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkjyRv_NWjwqUdN4xMZ7w_QhzSE19NmmaYEBhkYg-ICBjAHFnQ7nJyuvs5zXHGc6pq-Vk6U65OGbCdU75RcKjLA9Wo1LX2uUBdxxg9CXBMDAVKXflsTuZoJxn5sWkQnbF5a1iT7n_IXM0hyCUTsCQfXeOcrVUsReyVLZPzKb0KoWj1yTvqhL2NvF-ervIPHmioLw8LpLwz3loR3c5FiRI4ZLnhwD8549aPYj8nEZxImZy0h3yi1t0v29RxVA28oR53qm3-8J8zaaxl"
          />
        </div>

        {/* Slogan */}
        <div className="splash-slogan">
          <h1 className="text-2xl font-bold tracking-widest mb-3"
            style={{ fontFamily: 'Hanken Grotesk', color: '#c0222a', letterSpacing: '0.12em' }}>
            VEJA. ANALISE. CULTIVE.
          </h1>
          <div className="h-1 w-12 rounded-full mx-auto mb-2" style={{ background: '#2d6a4f' }} />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-10 left-0 w-full text-center px-8">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">
          Diagnóstico inteligente para morangueiros
        </p>
        <div className="flex justify-center gap-2">
          <span className="w-2 h-2 rounded-full splash-dot-1" style={{ background: '#22c55e' }} />
          <span className="w-2 h-2 rounded-full splash-dot-2" style={{ background: '#4ade80' }} />
          <span className="w-2 h-2 rounded-full splash-dot-3" style={{ background: '#2d6a4f' }} />
        </div>
      </div>
    </div>
  );
};

export default Splash;
