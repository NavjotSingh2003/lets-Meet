import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      setDarkMode(stored === 'true');
      document.documentElement.classList.toggle('dark', stored === 'true');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', newMode);
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  };

  const handleJoin = () => {
    const id = roomId.trim() || uuidv4();
    navigate(`/meeting/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gradient-to-br dark:from-purple-900 dark:via-indigo-900 dark:to-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleDarkMode}
          className="text-xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          title="Toggle Theme"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">🚀</span>
            <h1 className="text-4xl sm:text-5xl font-extrabold">Let's Meet</h1>
          </div>

          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
            Connect, collaborate, and communicate in real-time. Start your video meeting instantly!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <input
              type="text"
              placeholder="Enter or generate meeting ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full sm:w-80 px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 text-black dark:text-white"
            />
            <button
              onClick={handleJoin}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded text-white font-semibold shadow"
            >
              Join Meeting
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full bg-gray-100 dark:bg-gray-950 py-6 px-4 border-t border-gray-300 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <p>🔒 Secure, Peer-to-Peer Video Conferencing</p>
          <p>⚙️ Built with React, WebRTC, and Socket.io</p>
          <p>
            💻 <a href="https://github.com/NavjotSingh2003" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Navjot Singh on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
