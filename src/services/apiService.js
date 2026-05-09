const BASE_URL = "https://fatima983-website-translation-backend.hf.space";

setInterval(() => {
  fetch(`${BASE_URL}/`).catch(() => {});
}, 4 * 60 * 1000);

async function pollForResult(eventId, maxAttempts = 10, delayMs = 3000) {
  const resultUrl = `${BASE_URL}/gradio_api/call/transcribe/${eventId}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxAttempts}...`);
    await new Promise((res) => setTimeout(res, attempt === 1 ? 1000 : delayMs));

    try {
      const streamResponse = await fetch(resultUrl);
      if (!streamResponse.ok) continue;

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
      }

      const lines = fullText.split("\n");
      for (const line of lines) {
        if (line.startsWith("event: error")) {
          console.warn(`Attempt ${attempt} got error event, retrying...`);
          break; // break inner loop, retry outer
        }
        if (line.startsWith("data:")) {
          const raw = line.substring(5).trim();
          if (raw === "null") continue;
          try {
            const data = JSON.parse(raw);
            if (Array.isArray(data) && data.length > 0) return data[0].toString();
            if (typeof data === "string") return data;
          } catch (e) {
            console.warn("Parse error:", e);
          }
        }
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} fetch error:`, err.message);
    }
  }

  return "Translation timed out — the GPU may be busy. Please try again in a moment.";
}

export async function uploadAudio(audioBlob) {
  try {
    // Step 1: Upload
    const formData = new FormData();
    formData.append("files", audioBlob, "recording.wav");
    const uploadResponse = await fetch(`${BASE_URL}/gradio_api/upload`, {
      method: "POST",
      body: formData,
    });
    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      return `File upload failed: ${uploadResponse.status} — ${text}`;
    }
    const uploadedFiles = await uploadResponse.json();
    console.log("Upload response:", uploadedFiles);

    let uploadedPath;
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      uploadedPath = uploadedFiles[0];
    } else if (typeof uploadedFiles === "string") {
      uploadedPath = uploadedFiles;
    } else if (uploadedFiles?.path) {
      uploadedPath = uploadedFiles.path;
    } else {
      return `Unexpected upload response: ${JSON.stringify(uploadedFiles)}`;
    }
    console.log("Uploaded path:", uploadedPath);

    // Step 2: Trigger transcription
    const predictResponse = await fetch(`${BASE_URL}/gradio_api/call/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{ path: uploadedPath, meta: { _type: "gradio.FileData" } }],
      }),
    });
    if (!predictResponse.ok) {
      const text = await predictResponse.text();
      return `Predict failed: ${predictResponse.status} — ${text}`;
    }

    const { event_id } = await predictResponse.json();
    console.log("Event ID:", event_id);
    if (!event_id) return "No event ID returned";

    // Step 3: Poll with retries (handles ZeroGPU cold start)
    return await pollForResult(event_id);

  } catch (err) {
    console.error("API error:", err);
    return `Error: ${err.message}. The backend may be sleeping — please visit https://fatima983-website-translation-backend.hf.space to wake it up, then try again.`;
  }
}
