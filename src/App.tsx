
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ViewerPage from './components/ViewerPage';
import SharePage from './components/SharePage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="h-screen w-full flex flex-col overflow-hidden bg-background-dark">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/viewer" element={<ViewerPage />} />
          <Route path="/share" element={<SharePage />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
