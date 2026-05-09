const BASE_URL = "https://fatima983-website-translation-backend.hf.space";
const HF_TOKEN = ""; // replace with your full token

// Keep Space awake — ping every 4 minutes
setInterval(() => {
  fetch(`${BASE_URL}/`).catch(() => {});
}, 4 * 60 * 1000);

export async function uploadAudio(audioBlob) {
  try {
    // Step 1: Upload the file
    const formData = new FormData();
    formData.append("files", audioBlob, "recording.wav");
    const uploadResponse = await fetch(`${BASE_URL}/gradio_api/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HF_TOKEN}` },
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

    // Step 2: Call the transcribe endpoint
    const predictResponse = await fetch(`${BASE_URL}/gradio_api/call/transcribe`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HF_TOKEN}`
      },
      body: JSON.stringify({
        data: [{
          path: uploadedPath,
          url: `${BASE_URL}/gradio_api/file=${uploadedPath}`,
          orig_name: "recording.wav",
          meta: { _type: "gradio.FileData" }
        }]
      }),
    });

    if (!predictResponse.ok) {
      const text = await predictResponse.text();
      return `Predict failed: ${predictResponse.status} — ${text}`;
    }

    const { event_id } = await predictResponse.json();
    console.log("Event ID:", event_id);
    if (!event_id) return "No event ID returned";

    // Step 3: Stream the result
    const resultUrl = `${BASE_URL}/gradio_api/call/transcribe/${event_id}`;
    const streamResponse = await fetch(resultUrl, {
      headers: { "Authorization": `Bearer ${HF_TOKEN}` }
    });
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      console.log("Stream chunk:", text);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const data = JSON.parse(line.substring(5).trim());
            if (Array.isArray(data) && data.length > 0) {
              return data[0].toString();
            } else if (typeof data === "string") {
              return data;
            }
          } catch (parseErr) {
            console.warn("Parse error on line:", line, parseErr);
          }
        }
      }
    }
    return "No result received";

  } catch (err) {
    console.error("API error:", err);
    return `Error: ${err.message}. The backend may be sleeping — please visit https://fatima983-website-translation-backend.hf.space to wake it up, then try again.`;
  }
}
