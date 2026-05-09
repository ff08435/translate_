import { Client } from "@gradio/client";

const HF_TOKEN = "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";

export async function uploadAudio(audioBlob) {
  try {
    const client = await Client.connect("Fatima983/website-translation-backend", {
      token: HF_TOKEN,
    });

    const result = await client.predict("/transcribe", {
      audio_path: audioBlob,
    });

    return result.data[0];
  } catch (err) {
    console.error("API error:", err);
    return Error: ${err.message}. The backend may be sleeping or quota exceeded.;
  }
}
