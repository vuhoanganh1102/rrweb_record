import React from "react";
import styled from "styled-components";
import * as rrweb from "rrweb";
import rrwebPlayer from "rrweb-player";

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
 * Xuất video từ rrweb-player và download xuống dưới dạng MP4
 * @param {Array} events - Mảng các events được ghi lại từ rrweb
 * @param {Object} options - Các tùy chọn cho việc xuất video
 * @param {number} options.width - Chiều rộng của video (mặc định là 1280)
 * @param {number} options.height - Chiều cao của video (mặc định là 720)
 * @param {number} options.speed - Tốc độ phát lại (mặc định là 1)
 * @param {string} options.filename - Tên file khi download (mặc định là "recording.mp4")
 * @returns {Promise} - Promise sẽ resolve khi quá trình xuất video hoàn tất
 */
async function exportRecordingToVideo(events, options = {}) {
  const {
    width = 1280,
    height = 720,
    speed = 1,
    filename = "recording.mp4",
    onProgress = () => {},
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      const container = document.createElement("div");
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "9999px";
      container.style.zIndex = "";
      document.body.appendChild(container);

      // Đợi DOM render hoàn tất
      await new Promise((resolve) => setTimeout(resolve, 500));

      const fullSnapshot = events.find((e) => e.type === 2);
      console.log("FullSnapshot:", fullSnapshot);

      const replayer = new rrweb.Replayer(events, {
        root: container,
        width,
        height,
        speed,
        showController: false, // Tắt bộ điều khiển để tránh xung đột
        mouseTail: true,
      });
      console.log("check replay", replayer);

      // Để replayer có thời gian load đầy đủ
      await new Promise((resolve) => setTimeout(resolve, 1000));

      replayer.play();

      // Chờ thêm một khoảng thời gian để đảm bảo nội dung được render
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = container.querySelector("canvas");
      if (!canvas) {
        throw new Error("Canvas not found");
      }

      // Kiểm tra xem trình duyệt hỗ trợ MIME type nào
      const mimeType = MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.addEventListener("error", (event) => {
        console.error(`error recording stream: ${event.error.name}`);
      });

      mediaRecorder.start(100); // Ghi mỗi 100ms
      const duration = replayer.getMetaData().totalTime;

      console.log("check mediaRecorder", mediaRecorder);
      console.log("Duration:", duration);

      const checkProgress = () => {
        const currentTime = replayer.getCurrentTime();
        const progress = Math.min((currentTime / duration) * 100, 100);
        onProgress(progress);
        console.log(`Progress: ${progress.toFixed(2)}%`);

        if (currentTime >= duration) {
          console.log("Recording complete, stopping media recorder");
          mediaRecorder.stop();
          replayer.pause();
        } else {
          requestAnimationFrame(checkProgress);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, chunks:", chunks.length);
        // Xác định đúng extension file dựa trên mime type
        const fileExtension = mimeType.includes("webm") ? "webm" : "mp4";
        const finalFilename = filename.replace(/\.\w+$/, `.${fileExtension}`);

        const blob = new Blob(chunks, { type: mimeType });
        downloadBlob(blob, finalFilename);

        // Dọn dẹp
        document.body.removeChild(container);
        resolve(blob);
      };

      checkProgress();
    } catch (error) {
      console.error("Export error:", error);
      reject(error);
    }
  });
}

// Hàm download blob thường được định nghĩa như sau, nếu chưa có
async function downloadBlob(blob, filename) {
  // const mp4Blob = await convertWebmToMp4(blob);
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

const ExportVideo = ({ events, sessionId, disabled }) => {
  const [exporting, setExporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const handleExport = async () => {
    if (!events || events.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      await exportRecordingToVideo(events, {
        filename: `recording-${sessionId}.mp4`,
        onProgress: setProgress,
      });
      alert("Xuất video thành công!");
    } catch (error) {
      console.error("Lỗi khi xuất video:", error);
      alert(`Lỗi khi xuất video: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <ExportButton
        onClick={handleExport}
        disabled={disabled || exporting || !events || events.length === 0}
      >
        {exporting ? "Đang xuất..." : "Xuất video"}
      </ExportButton>

      {exporting && (
        <ProgressContainer>
          <ProgressBar progress={progress} />
        </ProgressContainer>
      )}
    </div>
  );
};

export default ExportVideo;
