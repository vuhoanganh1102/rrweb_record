import React, { useRef, useState } from "react";
import { Replayer } from "rrweb";

const ExportVideo = ({ events, sessionId, disabled }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const hiddenContainerRef = useRef(null);

  const handleExport = async () => {
    setIsExporting(true);
    setVideoUrl(null);

    // Tạo container ẩn
    const container = document.createElement("div");
    container.style.width = "1024px";
    container.style.height = "500px";
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    document.body.appendChild(container);
    await new Promise((r) => requestAnimationFrame(r)); // đợi DOM attach

    // Tạo Replayer
    const replayer = new Replayer(events, {
      root: container,
      width: 1024,
      height: 500,
      mouseTail: true,
      showController: false,
      speed: 1,
    });

    // Setup canvas recording
    const canvas = container.querySelector("canvas");
    const stream = canvas.captureStream();
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsExporting(false);
      document.body.removeChild(container);
    };

    recorder.start();

    replayer.play();

    // Dừng khi replay xong
    replayer.addEventListener("finish", () => {
      recorder.stop();
    });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <button onClick={handleExport} disabled={disabled || isExporting}>
        {isExporting ? "Exporting..." : "Export to Video"}
      </button>
      {videoUrl && (
        <div style={{ marginTop: 10 }}>
          <video src={videoUrl} controls width={600}></video>
          <a href={videoUrl} download={`session-${sessionId}.webm`}>
            Download Video
          </a>
        </div>
      )}
    </div>
  );
};

export default ExportVideo;
