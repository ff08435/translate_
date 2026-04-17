import { createClient } from "@supabase/supabase-js";

// ─── REPLACE with your Supabase project URL and anon key ───
const SUPABASE_URL = "https://tzupvoqxizpxserbvzob.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dXB2b3F4aXpweHNlcmJ2em9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODA2ODMsImV4cCI6MjA4NDI1NjY4M30.0TNbEdsZvF7cXlc41Vhbr096S1A9OLWUIwWWhQNB-_c";
// ───────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function submitFeedback({
  name,
  gender,
  dialect,
  modelTranslation,
  correctEnglish,
  audioBlob,
}) {
  // 1. Upload audio to Supabase Storage
  const fileName = `feedback_${Date.now()}.wav`;

  const { error: uploadError } = await supabase.storage
    .from("feedback-audio")
    .upload(fileName, audioBlob, { contentType: "audio/wav" });

  if (uploadError) throw new Error(uploadError.message);

  // 2. Get public URL
  const { data: urlData } = supabase.storage
    .from("feedback-audio")
    .getPublicUrl(fileName);

  const audioUrl = urlData.publicUrl;

  // 3. Insert into translator_feedback table
  const { error: insertError } = await supabase
    .from("translator_feedback")
    .insert({
      name,
      gender,
      dialect,
      model_translation: modelTranslation,
      correct_english: correctEnglish,
      audio_url: audioUrl,
    });

  if (insertError) throw new Error(insertError.message);
}