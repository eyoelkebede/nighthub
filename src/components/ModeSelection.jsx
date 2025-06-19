import React from 'react';
import styled from 'styled-components';

const ModeSelection = () => {
  return (
    <Container>
      <ModeButton>Safe Mode</ModeButton>
      <ModeButton>NSFW Mode</ModeButton>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
`;

const ModeButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
`;

export default ModeSelection;