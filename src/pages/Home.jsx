import React from 'react';
import ModeSelection from '../components/ModeSelection';
import TagSelection from '../components/TagSelection';

const Home = () => {
  return (
    <div>
      <h1>Welcome to NightHub</h1>
      <ModeSelection />
      <TagSelection />
    </div>
  );
};

export default Home;