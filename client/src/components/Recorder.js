import React, { useState, useEffect, useRef } from "react";
import * as rrweb from "rrweb";
import { io } from "socket.io-client";
import api from "../services/api";
import styled from "styled-components";
import ExportVideo from "../components/ExportRecordingToVideo"; // Import component ExportVideo
const RecorderContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const Button = styled.button`
  background-color: ${(props) => (props.isRecording ? "#f44336" : "#4CAF50")};
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-right: 10px;

  &:hover {
    opacity: 0.9;
  }
`;

const StatusIndicator = styled.div`
  padding: 10px;
  background-color: ${(props) => (props.isRecording ? "#ffebee" : "#e8f5e9")};
  border-radius: 4px;
  margin-top: 10px;
  display: flex;
  align-items: center;
`;

const RecordingDot = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  background-color: #f44336;
  border-radius: 50%;
  margin-right: 8px;
  animation: ${(props) => (props.isRecording ? "pulse 1.5s infinite" : "none")};

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
    100% {
      opacity: 1;
    }
  }
`;

const Recorder = ({ userId = "default-user" }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [events, setEvents] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const stopFnRef = useRef(null);
  const eventsBufferRef = useRef([]);
  const timerRef = useRef(null);

  // Batch size and interval for sending events
  const BATCH_SIZE = 50;
  const BATCH_INTERVAL = 5000; // 5 seconds

  // Connect to socket when component mounts
  useEffect(() => {
    socketRef.current = io(
      process.env.REACT_APP_API_URL || "http://localhost:5000"
    );

    socketRef.current.on("connect", () => {
      setSocketConnected(true);
      console.log("Connected to socket server");
    });

    socketRef.current.on("disconnect", () => {
      setSocketConnected(false);
      console.log("Disconnected from socket server");
    });

    socketRef.current.on("event-saved", (data) => {
      console.log("Event saved:", data);
    });

    socketRef.current.on("event-error", (data) => {
      console.error("Error saving event:", data);
    });

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Function to send events in batch
  const sendEvents = async (forceSend = false) => {
    if (
      sessionId &&
      (eventsBufferRef.current.length >= BATCH_SIZE ||
        (forceSend && eventsBufferRef.current.length > 0))
    ) {
      const eventsBatch = [...eventsBufferRef.current];
      eventsBufferRef.current = [];

      try {
        await api.saveEvents(sessionId, eventsBatch);
        setEvents((prev) => [...prev, ...eventsBatch]);
      } catch (error) {
        console.error("Failed to save events batch:", error);
        // Put events back in the buffer if save fails
        eventsBufferRef.current = [...eventsBufferRef.current, ...eventsBatch];
      }
    }
  };

  // Set up periodic batch sending
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        sendEvents(false);
      }, BATCH_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [isRecording, sessionId]);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Create a new session in the backend
      const { sessionId: newSessionId } = await api.startSession(userId, {
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        url: window.location.href,
      });

      setSessionId(newSessionId);
      setEvents([]);
      setRecordingTime(0);
      eventsBufferRef.current = [];

      // Start rrweb recording
      stopFnRef.current = rrweb.record({
        emit(event) {
          // Add event to buffer
          eventsBufferRef.current.push(event);

          // Optionally send via socket for real-time processing
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("record-event", {
              sessionId: newSessionId,
              event,
            });
          }
        },
        // Optional: customize what to record
        recordCanvas: true,
        collectFonts: true,
        inlineStylesheet: true,
      });

      setIsRecording(true);
      console.log("Recording started with session ID:", newSessionId);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (stopFnRef.current) {
      // Stop rrweb recording
      stopFnRef.current();
      stopFnRef.current = null;

      // Send any remaining events
      await sendEvents(true);

      // End the session in the backend
      try {
        await api.endSession(sessionId);
        console.log("Recording stopped and session ended");
      } catch (error) {
        console.error("Failed to end session:", error);
      }

      setIsRecording(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <RecorderContainer>
      <h2>Session Recorder</h2>
      <div>
        {!isRecording ? (
          <Button onClick={startRecording}>Start Recording</Button>
        ) : (
          <Button isRecording onClick={stopRecording}>
            Stop Recording
          </Button>
        )}

        <StatusIndicator isRecording={isRecording}>
          {isRecording ? (
            <>
              <RecordingDot isRecording />
              <span>Recording in progress - {formatTime(recordingTime)}</span>
            </>
          ) : (
            <span>Ready to record</span>
          )}
        </StatusIndicator>

        {isRecording && (
          <div style={{ marginTop: "10px" }}>
            <p>Session ID: {sessionId}</p>
            <p>
              Events captured: {events.length + eventsBufferRef.current.length}
            </p>
            <p>
              Socket connection:{" "}
              {socketConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
        )}
      </div>
    </RecorderContainer>
  );
};

export default Recorder;
