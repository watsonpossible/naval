import { Link, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';

const App = () => {
  const location = useLocation();
  const toggleTo = location.pathname === '/leaderboard' ? '/' : '/leaderboard';
  const label = location.pathname === '/leaderboard' ? 'Vote' : 'Leaderboard';

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-sm tracking-[0.3em] uppercase text-zinc-400">
          Naval Quote Battles
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to={toggleTo}
            className="rounded border border-zinc-700 px-4 py-2 text-xs uppercase tracking-wider hover:border-white"
          >
            {label}
          </Link>
          <Link to="/admin" className="rounded border border-zinc-700 px-4 py-2 text-xs uppercase tracking-wider hover:border-white">
            Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 pb-12">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
