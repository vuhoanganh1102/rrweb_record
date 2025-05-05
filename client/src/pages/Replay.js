import React from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import Player from "../components/Player";

const ReplayContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-top: 20px;
  color: #2196f3;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Replay = () => {
  const { sessionId } = useParams();

  return (
    <ReplayContainer>
      <h1>Session Replay</h1>
      <Player sessionId={sessionId} />
      <BackLink to="/sessions">Back to Sessions</BackLink>
    </ReplayContainer>
  );
};

export default Replay;
