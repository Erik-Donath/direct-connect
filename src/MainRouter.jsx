import { Routes, Route, HashRouter } from 'react-router-dom';
import App from './pages/App';
import Chat from './pages/Chat';
import Host from './pages/Host';
import MainLayout from './components/MainLayout';

export default function MainRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout title="Direct Connect" />}> 
          <Route path="/" element={<App />} />
          <Route path="/host" element={<Host />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
