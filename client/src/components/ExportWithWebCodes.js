import React, { useState } from "react";
import styled from "styled-components";
import * as rrweb from "rrweb";
import html2canvas from "html2canvas";
import { createFFmpeg, fetchFile } from "ffmpeg";
import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

const ExportButton = styled.button`
  background-color: #2196f3;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-right: 10px;
  margin-top: 10px;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ProgressContainer = styled.div`
  margin-top: 10px;
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 4px;
  height: 10px;
`;

const ProgressBar = styled.div`
  height: 100%;
  border-radius: 4px;
  background-color: #2196f3;
  width: ${(props) => props.progress}%;
  transition: width 0.3s ease-in-out;
`;

/**
 * Xuất video từ rrweb events sử dụng html2canvas để render chính xác DOM
 * @param {Array} events - Mảng các events được ghi lại từ rrweb
 * @param {Object} options - Các tùy chọn cho việc xuất video
 */

async function exportRecordingToVideo(events, options = {}) {
  const {
    width = 1280,
    height = 720,
    speed = 1,
    filename = "recording.mp4",
    fps = 30, // Frames per second
    onProgress = () => {},
    tempDir = "./temp_frames", // Thư mục tạm để lưu frame
  } = options;

  // Sử dụng fs trong Node.js

  // Tạo thư mục tạm nếu chưa tồn tại
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Tạo DOM ảo để render
      const dom = new JSDOM(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body, html { margin: 0; padding: 0; width: ${width}px; height: ${height}px; }
              #replay-container { width: ${width}px; height: ${height}px; background-color: #fff; }
            </style>
          </head>
          <body>
            <div id="replay-container"></div>
          </body>
        </html>
      `,
        {
          resources: "usable",
          runScripts: "dangerously",
        }
      );

      // Chuẩn bị môi trường DOM ảo
      const { window } = dom;
      const { document } = window;
      const replayContainer = document.getElementById("replay-container");

      // Thêm rrweb vào DOM ảo
      const rrwebScript = document.createElement("script");
      const rrwebPath = require.resolve("rrweb");
      rrwebScript.textContent = fs.readFileSync(rrwebPath, "utf-8");
      document.head.appendChild(rrwebScript);

      // Đợi script load
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Khởi tạo replayer trong DOM ảo
      const replayer = new window.rrweb.Replayer(events, {
        root: replayContainer,
        width,
        height,
        speed,
        showController: false,
        mouseTail: true,
      });

      // Khởi tạo FFmpeg
      const ffmpeg = createFFmpeg({
        log: true,
        corePath: require("@ffmpeg/core").corePath,
      });

      await ffmpeg.load();
      console.log("FFmpeg loaded");

      // Chơi và chụp từng frame
      console.log("Starting replay and capture...");
      const duration = replayer.getMetaData().totalTime;
      const frameInterval = 1000 / fps; // Milliseconds between frames
      const totalFrames = Math.ceil(duration / frameInterval);

      replayer.play();

      // Đợi để đảm bảo render ban đầu
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capture các frame
      for (let frameCount = 0; frameCount < totalFrames; frameCount++) {
        // Tính toán thời điểm hiện tại
        const currentTime = frameCount * frameInterval;

        try {
          replayer.pause();
          replayer.goto(currentTime);

          // Đợi một chút để đảm bảo render
          await new Promise((resolve) => setTimeout(resolve, 30));

          // Chụp frame bằng html2canvas
          const canvas = await html2canvas(replayContainer, {
            width,
            height,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
          });

          // Lưu frame thành file
          const frameFileName = path.join(
            tempDir,
            `frame_${frameCount.toString().padStart(5, "0")}.jpg`
          );
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

          fs.writeFileSync(frameFileName, Buffer.from(base64Data, "base64"));

          // Báo cáo tiến độ
          const progress = (frameCount / totalFrames) * 100;
          onProgress(progress);
          console.log(
            `Captured frame ${frameCount}/${totalFrames} (${progress.toFixed(
              2
            )}%)`
          );
        } catch (e) {
          console.error("Error capturing frame:", e);
        }
      }

      // Đóng replayer
      replayer.pause();

      // Tạo video từ các frame bằng FFmpeg
      console.log("Creating video from frames...");

      // Viết danh sách frames vào file để FFmpeg xử lý
      const frameListFile = path.join(tempDir, "frames.txt");
      let frameListContent = "";
      for (let i = 0; i < totalFrames; i++) {
        const framePath = path.join(
          tempDir,
          `frame_${i.toString().padStart(5, "0")}.jpg`
        );
        if (fs.existsSync(framePath)) {
          frameListContent += `file '${framePath}'\nduration ${1 / fps}\n`;
        }
      }
      fs.writeFileSync(frameListFile, frameListContent);

      // Thêm file danh sách frames vào FFmpeg
      ffmpeg.FS("writeFile", "frames.txt", await fetchFile(frameListFile));

      // Chuyển đổi frames thành video
      await ffmpeg.run(
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "frames.txt",
        "-vsync",
        "vfr",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "fast",
        "-crf",
        "23",
        "output.mp4"
      );

      // Lấy video output
      const data = ffmpeg.FS("readFile", "output.mp4");

      // Lưu video
      fs.writeFileSync(filename, Buffer.from(data.buffer));

      // Cleanup
      console.log("Cleaning up temporary files...");
      for (let i = 0; i < totalFrames; i++) {
        const framePath = path.join(
          tempDir,
          `frame_${i.toString().padStart(5, "0")}.jpg`
        );
        if (fs.existsSync(framePath)) {
          fs.unlinkSync(framePath);
        }
      }
      fs.unlinkSync(frameListFile);

      // Có thể xóa thư mục tạm nếu trống
      if (fs.readdirSync(tempDir).length === 0) {
        fs.rmdirSync(tempDir);
      }

      console.log(`Video exported successfully to ${filename}`);
      resolve(filename);
    } catch (error) {
      console.error("Export failed:", error);
      reject(error);
    }
  });
}

// Hàm để tải script từ URL
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Hàm download blob thường được định nghĩa như sau, nếu chưa có
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
/**
 * Hàm chuyển đổi WebM sang MP4 sử dụng FFmpeg.wasm
 * Lưu ý: Cần thêm thư viện FFmpeg.wasm vào dự án
 */
async function convertWebmToMp4(webmBlob) {
  try {
    // Import ffmpeg
    const { createFFmpeg, fetchFile } = await import("@ffmpeg/ffmpeg");

    // Khởi tạo ffmpeg
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    // Tải file webm
    ffmpeg.FS("writeFile", "input.webm", await fetchFile(webmBlob));

    // Chuyển đổi sang MP4
    await ffmpeg.run(
      "-i",
      "input.webm",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "22",
      "output.mp4"
    );

    // Lấy file đầu ra
    const data = ffmpeg.FS("readFile", "output.mp4");

    // Tạo blob và trả về
    return new Blob([data.buffer], { type: "video/mp4" });
  } catch (error) {
    console.error("Lỗi khi chuyển đổi WebM sang MP4:", error);
    // Trả về webm nếu không thể chuyển đổi
    return webmBlob;
  }
}

const ExportVideo = ({ events, sessionId, disabled }) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  const handleExport = async () => {
    if (!events || events.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    setExporting(true);
    setProgress(0);
    setConversionProgress(0);
    setIsConverting(false);

    try {
      // Xuất video sử dụng html2canvas
      const webmBlob = await exportRecordingToVideo(events, {
        filename: `recording-${sessionId}`,
        onProgress: setProgress,
      });

      // Chuyển đổi sang MP4 nếu cần
      if (window.ffmpegLoaded || typeof createFFmpeg === "function") {
        setIsConverting(true);

        try {
          const mp4Blob = await convertWebmToMp4(webmBlob);

          // Download MP4
          const url = URL.createObjectURL(mp4Blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `recording-${sessionId}.mp4`;
          a.click();
          URL.revokeObjectURL(url);

          setIsConverting(false);
          alert("Xuất video thành công!");
        } catch (conversionError) {
          console.error("Không thể chuyển đổi sang MP4:", conversionError);
          // Đã download WebM ở trên, không cần làm gì thêm
          alert("Xuất video WebM thành công! Không thể chuyển đổi sang MP4.");
        }
      }
    } catch (error) {
      console.error("Lỗi khi xuất video:", error);
      alert(`Lỗi khi xuất video: ${error.message}`);
    } finally {
      setExporting(false);
      setIsConverting(false);
    }
  };

  return (
    <div>
      <ExportButton
        onClick={handleExport}
        disabled={disabled || exporting || !events || events.length === 0}
      >
        {exporting
          ? isConverting
            ? "Đang chuyển đổi định dạng..."
            : "Đang xuất video..."
          : "Xuất video"}
      </ExportButton>

      {exporting && !isConverting && (
        <ProgressContainer>
          <ProgressBar progress={progress} />
        </ProgressContainer>
      )}

      {isConverting && (
        <div style={{ marginTop: 10 }}>
          <div>Đang chuyển đổi sang MP4...</div>
          <ProgressContainer>
            <ProgressBar progress={conversionProgress} />
          </ProgressContainer>
        </div>
      )}
    </div>
  );
};

export default ExportVideo;
