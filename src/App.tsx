import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Chat from './pages/Chat';
import WaitingRoom from './pages/WaitingRoom';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />
      </Routes>
    </Router>
  );
};

export default App;