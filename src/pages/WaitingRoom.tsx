import React from 'react';
import styled from 'styled-components';

const WaitingRoom = () => {
  return (
    <Container>
      <h1>Waiting Room</h1>
      <p>You are in the queue.</p>
      <p>Please wait while we find a connection for you.</p>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #282c34;
  color: white;
`;

// This is the line that fixes the error
export default WaitingRoom;