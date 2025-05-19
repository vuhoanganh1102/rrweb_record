import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import api from "../services/api";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
// import ExportVideo from "./ExportWithWebCodes";
// import ExportVideo from "./ExportWithRRVideo";
import ExportVideo from "./ExportRecordingToVideo";
// import { exportVideo } from "@rrweb/rrvideo";
const PlayerContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
`;

const PlayerControls = styled.div`
  display: flex;
  align-items: center;
  margin-top: 15px;
  gap: 10px;
`;

const Button = styled.button`
  background-color: #2196f3;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0b7dda;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const Player = ({ sessionId }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const sessionData = await api.getSession(sessionId);
        // console.log(
        //   "Event types:",
        //   sessionData?.events.map((e) => e.type)
        // );
        setSession(sessionData);
        setLoading(false);
      } catch (err) {
        setError("Failed to load session data");
        setLoading(false);
        console.error("Error fetching session:", err);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (!session || !session.events || session.events.length === 0) return;

    // Clean up previous player instance
    if (playerInstanceRef.current) {
      playerInstanceRef.current.pause();
      playerInstanceRef.current = null;
    }

    // Initialize rrweb-player
    if (playerRef.current) {
      playerRef.current.innerHTML = ""; // ⬅️ Thêm dòng này để xóa DOM cũ
    }

    // Initialize rrweb-player
    playerInstanceRef.current = new rrwebPlayer({
      target: playerRef.current,
      props: {
        events: session.events,
        width: playerRef.current?.clientWidth || 1024,
        height: 500,
        autoPlay: false,
        showController: true,
        speedOption: [0.5, 1, 1.5, 2],
        mouseTail: true,
      },
    });

    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.pause();
        playerInstanceRef.current = null;
      }
    };
  }, [session]);

  if (loading) {
    return <div>Loading session data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!session || !session.events || session.events.length === 0) {
    return <div>No recording data available for this session.</div>;
  }
  return (
    <>
      <PlayerContainer>
        <h2>Session Playback</h2>
        <div>
          <p>Session ID: {session.sessionId}</p>
          <p>Recorded on: {new Date(session.startTime).toLocaleString()}</p>
        </div>

        <div ref={playerRef}></div>
      </PlayerContainer>
      {/* Thêm component ExportVideo ở đây */}
      {session.events.length > 0 && sessionId && (
        <ExportVideo
          events={session.events}
          sessionId={sessionId}
          disabled={false}
        />
      )}
    </>
  );
};

export default Player;
