import { Client, handle_file } from "@gradio/client";

const HF_TOKEN = process.env.REACT_APP_HF_TOKEN;
const SPACE = "Fatima983/website-translation-backend";

const FATAL_STATUSES = new Set(["paused", "stopped", "space_error"]);
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
    const ext = audioBlob.type.includes("ogg") ? "ogg" : "webm";
    const audioFile = new File([audioBlob], `recording.${ext}`, {
      type: audioBlob.type,
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
