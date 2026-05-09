const BASE_URL = "https://fatima983-website-translation-backend.hf.space";

setInterval(() => {
  fetch(`${BASE_URL}/`).catch(() => {});
}, 4 * 60 * 1000);

async function getEventId(uploadedPath) {
  const predictResponse = await fetch(`${BASE_URL}/gradio_api/call/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [{ path: uploadedPath, meta: { _type: "gradio.FileData" } }],
    }),
  });
  if (!predictResponse.ok) {
    const text = await predictResponse.text();
    throw new Error(`Predict failed: ${predictResponse.status} — ${text}`);
  }
  const { event_id } = await predictResponse.json();
  if (!event_id) throw new Error("No event ID returned");
  return event_id;
}

async function tryOnce(eventId) {
  const resultUrl = `${BASE_URL}/gradio_api/call/transcribe/${eventId}`;
  const streamResponse = await fetch(resultUrl);
  if (!streamResponse.ok) return null;

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
    if (line.startsWith("event: error")) return null; // signal to retry
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
  return null;
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

    // Step 2: Retry loop — fresh event ID each attempt
    const delays = [1000, 3000, 4000, 4000, 4000, 5000, 5000, 5000, 5000, 5000];
    const maxAttempts = delays.length;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((res) => setTimeout(res, delays[attempt - 1]));
      console.log(`Attempt ${attempt}/${maxAttempts} — requesting new event ID...`);

      try {
        const eventId = await getEventId(uploadedPath);
        console.log("Event ID:", eventId);
        const result = await tryOnce(eventId);
        if (result !== null) {
          console.log("Got result:", result);
          return result;
        }
        console.warn(`Attempt ${attempt} returned error/null, retrying...`);
      } catch (err) {
        console.warn(`Attempt ${attempt} error:`, err.message);
      }
    }

    return "Translation timed out — the GPU may be busy. Please try again in a moment.";

  } catch (err) {
    console.error("API error:", err);
    return `Error: ${err.message}. The backend may be sleeping — please visit https://fatima983-website-translation-backend.hf.space to wake it up, then try again.`;
  }
}
