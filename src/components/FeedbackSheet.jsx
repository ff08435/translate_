import React, { useState, useEffect, useRef } from 'react';
import { startRecording, stopRecording } from '../services/audioService';
import { submitFeedback } from '../services/feedbackService';
import styles from './FeedbackSheet.module.css';

const GENDERS  = ['Male', 'Female', 'Prefer not to say'];
const DIALECTS = ['Hunza', 'Nagar', 'Yasin', 'Other'];

export default function FeedbackSheet({ originalTranslation, onClose }) {
  const [name, setName]           = useState('');
  const [gender, setGender]       = useState('');
  const [dialect, setDialect]     = useState('');
  const [correctEn, setCorrectEn] = useState('');
  const [isRecording, setIsRecording]   = useState(false);
  const [audioBlob, setAudioBlob]       = useState(null);
  const [recordStatus, setRecordStatus] = useState('Tap the mic to record the correct Burushaski sentence');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const overlayRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (e.target === overlayRef.current) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleRecord = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      setIsRecording(false);
      setAudioBlob(blob);
      setRecordStatus('✓ Recording saved. Tap to re-record if needed.');
    } else {
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
        setAudioBlob(null);
        setRecordStatus('Recording… tap again to stop.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim())    { setError('Please enter your name.'); return; }
    if (!gender)         { setError('Please select your gender.'); return; }
    if (!dialect)        { setError('Please select your dialect.'); return; }
    if (!audioBlob)      { setError('Please record the Burushaski sentence.'); return; }
    if (!correctEn.trim()) { setError('Please enter the correct English translation.'); return; }

    setError(''); setSubmitting(true);
    try {
      await submitFeedback({
        name: name.trim(),
        gender,
        dialect,
        modelTranslation: originalTranslation,
        correctEnglish: correctEn.trim(),
        audioBlob,
      });
      onClose();
      // Brief success toast — parent handles this via state if needed
      alert('Thank you! Your feedback has been submitted.');
    } catch (e) {
      setError(`Failed to submit: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const micColor = isRecording ? 'var(--error)' : audioBlob ? 'var(--success)' : 'var(--accent-orange)';

  return (
    <div className={styles.overlay} ref={overlayRef}>
      <div className={styles.sheet}>
        {/* Handle */}
        <div className={styles.handle} />

        {/* Title */}
        <div className={styles.titleRow}>
          <div>
            <h2 className={styles.title}>Suggest a Correction</h2>
            <p className={styles.subtitle}>Help us improve the model with your feedback.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* Model translation */}
          <Section label="Model's translation">
            <div className={styles.modelOutput}>{originalTranslation}</div>
          </Section>

          {/* Name */}
          <Section label="Your name">
            <input
              className={styles.input}
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </Section>

          {/* Gender */}
          <Section label="Gender">
            <div className={styles.chipRow}>
              {GENDERS.map(g => (
                <button
                  key={g}
                  className={`${styles.chip} ${gender === g ? styles.chipActive : ''}`}
                  onClick={() => setGender(g)}
                  type="button"
                >
                  {g}
                </button>
              ))}
            </div>
          </Section>

          {/* Dialect */}
          <Section label="Dialect">
            <div className={styles.chipRow}>
              {DIALECTS.map(d => (
                <button
                  key={d}
                  className={`${styles.chip} ${dialect === d ? styles.chipActive : ''}`}
                  onClick={() => setDialect(d)}
                  type="button"
                >
                  {d}
                </button>
              ))}
            </div>
          </Section>

          {/* Audio recording */}
          <Section label="Record the correct Burushaski sentence">
            <div className={styles.recordRow}>
              <button
                className={styles.micBtn}
                onClick={handleRecord}
                style={{ background: micColor, boxShadow: `0 4px 20px ${micColor}55` }}
                type="button"
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording
                  ? <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  : audioBlob
                  ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                }
              </button>
              <p className={styles.recordStatus} style={{ color: audioBlob ? 'var(--success)' : 'var(--text-dark-gray)' }}>
                {recordStatus}
              </p>
            </div>
          </Section>

          {/* Correct English */}
          <Section label="Correct English translation">
            <textarea
              className={styles.textarea}
              placeholder="Type the correct English translation…"
              value={correctEn}
              onChange={e => setCorrectEn(e.target.value)}
              rows={3}
            />
          </Section>

          {error && <p className={styles.error}>{error}</p>}

          {/* Submit */}
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting} type="button">
            {submitting
              ? <span className={styles.spinner} />
              : 'Submit Feedback'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>{label}</p>
      {children}
    </div>
  );
}