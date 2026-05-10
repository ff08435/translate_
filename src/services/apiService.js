import { Client, handle_file } from "@gradio/client";

const HF_TOKEN = process.env.REACT_APP_HF_TOKEN;
const SPACE = "Fatima983/website-translation-backend";
const FATAL_STATUSES = new Set(["paused", "stopped", "space_error"]);

async function convertToWav(audioBlob) {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const numChannels = 1; // mono
  const sampleRate = 16000;
  const samples = audioBuffer.getChannelData(0); // take first channel
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  audioContext.close();
  return new Blob([buffer], { type: "audio/wav" });
}

async function connectWithRetry(onStatus, maxRetries = 3) {
  let lastErr;
  let fatalStatus = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    fatalStatus = null;
    try {
      const client = await Client.connect(SPACE, {
        token: HF_TOKEN,
        status_callback: (status) => {
          console.log("Space status:", status);
          if (onStatus) onStatus(status);
          if (FATAL_STATUSES.has(status.status)) {
            fatalStatus = status;
          }
        },
      });
      if (!client || !client.config) {
        throw new Error(
          fatalStatus
            ? `Space is ${fatalStatus.status}: ${fatalStatus.message}`
            : "Connected but received an empty app config. The space may still be starting."
        );
      }
      return client;
    } catch (err) {
      lastErr = err;
      if (fatalStatus) {
        throw new Error(
          `Space is ${fatalStatus.status}: ${fatalStatus.message}`
        );
      }
      console.warn(`Connection attempt ${attempt + 1} failed:`, err.message);
      if (attempt < maxRetries - 1) {
        const delay = 2000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

export async function uploadAudio(audioBlob, onStatus) {
  try {
    const client = await connectWithRetry(onStatus);
    const wavBlob = await convertToWav(audioBlob);
    const audioFile = new File([wavBlob], "recording.wav", {
      type: "audio/wav",
    });
    const result = await client.predict("/transcribe", {
      audio_path: handle_file(audioFile),
    });
    return result.data[0];
  } catch (err) {
    console.error("API error:", err);
    return `Error: ${err.message}.`;
  }
}

let mediaRecorder = null;
let audioChunks = [];
let stream = null;

export async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    mediaRecorder.start(100);
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
