import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import api from "../services/api";

const SessionsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const SessionList = styled.div`
  margin-top: 20px;
`;

const SessionCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SessionInfo = styled.div`
  flex-grow: 1;
`;

const SessionTitle = styled.h3`
  margin: 0 0 8px;
`;

const SessionMeta = styled.div`
  color: #666;
  font-size: 14px;
`;

const SessionDuration = styled.span`
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-left: 10px;
`;

const ViewButton = styled(Link)`
  background-color: #2196f3;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;

  &:hover {
    background-color: #0b7dda;
  }
`;

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock user ID - in a real app, get from auth context
  const userId = "user-123";

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await api.getUserSessions(userId);
        setSessions(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load sessions");
        setLoading(false);
        console.error("Error fetching sessions:", err);
      }
    };

    fetchSessions();
  }, [userId]);

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "N/A";

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <SessionsContainer>Loading sessions...</SessionsContainer>;
  }

  if (error) {
    return <SessionsContainer>Error: {error}</SessionsContainer>;
  }

  return (
    <SessionsContainer>
      <h1>Your Recording Sessions</h1>

      {sessions.length === 0 ? (
        <p>No recording sessions found. Start by creating a new recording.</p>
      ) : (
        <SessionList>
          {sessions.map((session) => (
            <SessionCard key={session.sessionId}>
              <SessionInfo>
                <SessionTitle>
                  Session {session.sessionId.substring(0, 8)}...
                  <SessionDuration>
                    {calculateDuration(session.startTime, session.endTime)}
                  </SessionDuration>
                </SessionTitle>
                <SessionMeta>
                  Recorded on: {new Date(session.startTime).toLocaleString()}
                  {session.metadata && session.metadata.url && (
                    <div>URL: {session.metadata.url}</div>
                  )}
                </SessionMeta>
              </SessionInfo>
              <ViewButton to={`/replay/${session.sessionId}`}>
                View Recording
              </ViewButton>
            </SessionCard>
          ))}
        </SessionList>
      )}

      <div style={{ marginTop: "20px" }}>
        <Link to="/">Back to Home</Link>
      </div>
    </SessionsContainer>
  );
};

export default Sessions;
