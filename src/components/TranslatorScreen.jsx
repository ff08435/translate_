import React, { useState, useCallback } from 'react';
import { startRecording, stopRecording } from '../services/audioService';
import { uploadAudio } from '../services/apiService';
import FeedbackSheet from './FeedbackSheet';
import styles from './TranslatorScreen.module.css';

const PLACEHOLDER = 'Translation will appear here';

export default function TranslatorScreen({ navigate }) {
  const [isRecording, setIsRecording]       = useState(false);
  const [translation, setTranslation]       = useState(PLACEHOLDER);
  const [showFeedback, setShowFeedback]     = useState(false);
  const [showFeedbackBtn, setShowFeedbackBtn] = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);

  const handleRecordPress = useCallback(async () => {
    if (isRecording) {
      // Stop
      const blob = await stopRecording();
      setIsRecording(false);
      setShowFeedbackBtn(false);

      if (blob) {
        setIsProcessing(true);
        setTranslation('Processing audio…');
        const result = await uploadAudio(blob);
        setTranslation(
          result ??
          'Could not reach the translation server. The backend may be sleeping — try again in a moment.'
        );
        setShowFeedbackBtn(true);
        setIsProcessing(false);
      }
    } else {
      // Start
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
        setTranslation(PLACEHOLDER);
        setShowFeedbackBtn(false);
      }
    }
  }, [isRecording]);

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
              <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
            </svg>
            <span className={styles.logoText}>YARAN</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Language direction bar */}
        <div className={styles.langBar}>
          <span className={styles.lang}>Burushaski</span>
          <div className={styles.arrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <span className={styles.lang}>English</span>
        </div>

        {/* Record section */}
        <div className={styles.recordSection}>
          <RecordButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPress={handleRecordPress}
          />
          <p className={styles.recordLabel}>
            {isProcessing
              ? 'Processing…'
              : isRecording
              ? 'Recording… tap to stop'
              : 'Tap to speak'}
          </p>
        </div>

        {/* Translation output card */}
        <div className={styles.outputCard}>
          <div className={styles.outputHeader}>
            <span className={styles.outputLang}>English</span>
            {showFeedbackBtn && (
              <button className={styles.flagBtn} onClick={() => setShowFeedback(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                Suggest correction
              </button>
            )}
          </div>

          <div className={styles.outputBody}>
            {isProcessing ? (
              <ProcessingDots />
            ) : (
              <p className={`${styles.outputText} ${translation === PLACEHOLDER ? styles.placeholder : ''}`}>
                {translation}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Feedback modal */}
      {showFeedback && (
        <FeedbackSheet
          originalTranslation={translation}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

/* ── Record Button ───────────────────────────────────────── */
function RecordButton({ isRecording, isProcessing, onPress }) {
  return (
    <button
      className={`${styles.recordBtn} ${isRecording ? styles.active : ''} ${isProcessing ? styles.processing : ''}`}
      onClick={onPress}
      disabled={isProcessing}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording && <span className={styles.ring1} />}
      {isRecording && <span className={styles.ring2} />}

      <span className={styles.recordBtnInner}>
        {isProcessing ? (
          <span className={styles.spinner} />
        ) : isRecording ? (
          /* Stop icon */
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          /* Mic icon */
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
          </svg>
        )}
      </span>

      {/* Sound wave bars when recording */}
      {isRecording && (
        <span className={styles.waves}>
          {[...Array(5)].map((_, i) => (
            <span key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
      )}
    </button>
  );
}

/* ── Processing dots ─────────────────────────────────────── */
function ProcessingDots() {
  return (
    <div className={styles.dots}>
      {[0, 1, 2].map(i => (
        <span key={i} className={styles.dot} style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}