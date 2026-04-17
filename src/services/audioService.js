let mediaRecorder = null;
let audioChunks = [];
let stream = null;

export async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Prefer wav-compatible format; fall back to whatever the browser supports
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg";

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start(100); // collect data every 100ms
    return true;
  } catch (err) {
    console.error("Error starting recording:", err);
    return false;
  }
}

export async function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder) {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(audioChunks, { type: mimeType });

      // Stop all tracks to release microphone
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }

      mediaRecorder = null;
      audioChunks = [];
      resolve(blob);
    };

    mediaRecorder.stop();
  });
}

export function isRecording() {
  return mediaRecorder?.state === "recording";
}