const BASE_URL = "https://fatima983-website-translation-backend.hf.space";

export async function uploadAudio(audioBlob) {
  try {
    // Step 1: Upload the file
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
    // Handle different response shapes
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            path: uploadedPath,
            meta: { _type: "gradio.FileData" },
          },
        ],
      }),
    });
    if (!predictResponse.ok) {
      const text = await predictResponse.text();
      return `Predict failed: ${predictResponse.status} — ${text}`;
    }
    const jsonResponse = await predictResponse.json();
    console.log("Predict response:", jsonResponse);
    const eventId = jsonResponse.event_id;
    if (!eventId) {
      return `No event ID returned: ${JSON.stringify(jsonResponse)}`;
    }

    // Step 3: Poll for result — check immediately first, then wait between retries
    const resultUrl = `${BASE_URL}/gradio_api/call/transcribe/${eventId}`;
    const maxAttempts = 30;  // increased from 15 to cover cold starts (~2 min total)
    const delayMs = 2000;    // reduced from 4000ms to 2000ms for faster response

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt}/${maxAttempts}...`);
      const resultResponse = await fetch(resultUrl); // check immediately, no upfront wait
      console.log(`Poll status: ${resultResponse.status}`);

      if (resultResponse.ok) {
        const body = await resultResponse.text();
        console.log("Poll body:", body);
        const lines = body.split("\n");
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
        // Got 200 but couldn't parse yet — wait then retry
      } else if (resultResponse.status === 202) {
        // Still processing — keep polling
      } else {
        return `Result fetch failed: ${resultResponse.status}`;
      }

      await new Promise((res) => setTimeout(res, delayMs)); // wait at end, not start
    }

    return "Translation timed out. The model is taking too long — please try again.";
  } catch (err) {
    console.error("API error:", err);
    return `Error: ${err.message}. The backend may be sleeping — please visit https://fatima983-burushaski-backend.hf.space to wake it up, then try again.`;
  }
}
