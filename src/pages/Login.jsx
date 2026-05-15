import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/home');
    }, 1400);
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/home');
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f5f3f3' }}>
      <div className="scroll-area flex-1">
        {/* Header */}
        <div className="flex flex-col items-center pt-14 pb-6 px-6">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 28, color: '#c0222a' }}>🍓</span>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Hanken Grotesk', color: '#c0222a' }}>
              Scanberry
            </span>
          </div>
          <p className="text-center text-gray-500 text-sm px-4">
            Monitoramento inteligente para sua<br />produção de morangos.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mx-5 mb-4 flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          <button
            onClick={() => setTab('login')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: tab === 'login' ? '#c0222a' : 'transparent',
              color: tab === 'login' ? 'white' : '#6b7280',
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => setTab('register')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: tab === 'register' ? '#c0222a' : 'transparent',
              color: tab === 'register' ? 'white' : '#6b7280',
            }}
          >
            Criar Conta
          </button>
        </div>

        {/* Form Card */}
        <div className="mx-5 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <form onSubmit={handleLogin}>
            {tab === 'register' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: João Silva"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="nome@fazenda.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Senha</label>
                {tab === 'login' && (
                  <button type="button" className="text-sm font-medium" style={{ color: '#c0222a' }}>
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-white font-semibold text-base rounded-full btn-primary flex items-center justify-center gap-2"
              style={{ background: '#c0222a' }}
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (tab === 'login' ? 'Entrar' : 'Criar conta')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full py-3.5 flex items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-semibold text-gray-700">Entrar com Google</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 mb-6">
          © 2024 BerryGrow AI. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
