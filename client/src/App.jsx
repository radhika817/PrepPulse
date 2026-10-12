import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Daily from './pages/Daily';
import Questions from './pages/Questions';
import Practice from './pages/Practice';
import Revision from './pages/Revision';
import Bookmarks from './pages/Bookmarks';
import Profile from './pages/Profile';

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="daily" element={<Daily />} />
        <Route path="questions" element={<Questions />} />
        <Route path="practice" element={<Practice />} />
        <Route path="revision" element={<Revision />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
