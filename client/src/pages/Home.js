import React from "react";
import Recorder from "../components/Recorder";
import styled from "styled-components";

const HomeContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.header`
  margin-bottom: 30px;
  text-align: center;
`;

const Home = () => {
  // Use a mock user ID or get from auth system
  const userId = "user-123";

  return (
    <HomeContainer>
      <Header>
        <h1>rrweb Recording Demo</h1>
        <p>Record and replay user interactions on your website</p>
      </Header>

      <Recorder userId={userId} />

      <div>
        <h2>Instructions</h2>
        <ol>
          <li>Click "Start Recording" to begin capturing your interactions</li>
          <li>Interact with the page as normal</li>
          <li>Click "Stop Recording" when you're done</li>
          <li>Go to the Sessions page to view your recordings</li>
        </ol>

        <p>
          <strong>Note:</strong> All your interactions including mouse
          movements, clicks, scrolls, and form inputs will be recorded.
        </p>
      </div>
    </HomeContainer>
  );
};

export default Home;
