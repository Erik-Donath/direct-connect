import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App';
import Chat from './pages/Chat';
import Host from './pages/Host';
import MainLayout from './components/MainLayout';

export default function MainRouter() {
  const base = import.meta.env.BASE_URL || '/';
  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route element={<MainLayout title="Direct Connect" />}> 
          <Route path="/" element={<App />} />
          <Route path="/host" element={<Host />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
