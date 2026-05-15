import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Home from './pages/Home';
import Analisar from './pages/Analisar';
import Resultado from './pages/Resultado';
import Mapa from './pages/Mapa';
import Historico from './pages/Historico';
import Perfil from './pages/Perfil';
import Relatorios from './pages/Relatorios';
import DadosPropriedade from './pages/DadosPropriedade';
import Equipe from './pages/Equipe';
import NotificacoesConfig from './pages/NotificacoesConfig';
import Ajuda from './pages/Ajuda';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col font-body-md text-on-surface">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/analisar" element={<Analisar />} />
          <Route path="/resultado" element={<Resultado />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/dados-propriedade" element={<DadosPropriedade />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/notificacoes-config" element={<NotificacoesConfig />} />
          <Route path="/ajuda" element={<Ajuda />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
