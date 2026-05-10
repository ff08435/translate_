import React, { useEffect, useState } from 'react';
import styles from './WelcomeScreen.module.css';

export default function WelcomeScreen({ navigate }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Staggered entrance
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.root}>
      {/* Ambient orbs */}
      <div className={styles.orbTopRight} />
      <div className={styles.orbBottomLeft} />

      <div className={`${styles.content} ${visible ? styles.visible : ''}`}>
        {/* Logo */}
        <div className={styles.logoWrap} style={{ animationDelay: '0.1s' }}>
          <div className={styles.logoRing} />
          <div className={styles.logoRing2} />
          <div className={styles.logoCircle}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
              <path d="M22 22l-5-10-5 10" /><path d="M14 18h6" />
            </svg>
          </div>
        </div>

        {/* App name */}
        <h1 className={styles.appName} style={{ animationDelay: '0.2s' }}>YAARAN</h1>

        <p className={styles.tagline} style={{ animationDelay: '0.3s' }}>
          Burushaski → English
        </p>

        <p className={styles.subtext} style={{ animationDelay: '0.4s' }}>
          Speak in Burushaski and receive<br />instant English translations.
        </p>

        {/* Decorative divider */}
        <div className={styles.divider} style={{ animationDelay: '0.45s' }}>
          <span /><span className={styles.dot} /><span />
        </div>

        {/* CTA */}
        <button
          className={styles.ctaBtn}
          style={{ animationDelay: '0.5s' }}
          onClick={() => navigate('translator')}
        >
          <span>Get Started</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        <div className={styles.authRow} style={{ animationDelay: '0.6s' }}>
          <button className={styles.linkBtn} onClick={() => navigate('login')}>Sign In</button>
          <span className={styles.authSep}>·</span>
          <button className={styles.linkBtn} onClick={() => navigate('register')}>Create Account</button>
        </div>
      </div>
    </div>
  );
}
