import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import TranslatorScreen from './components/TranslatorScreen';

export default function App() {
  const [screen, setScreen] = useState('welcome'); // welcome | login | register | translator

  const navigate = (to) => setScreen(to);

  switch (screen) {
    case 'login':      return <LoginScreen    navigate={navigate} />;
    case 'register':   return <RegisterScreen navigate={navigate} />;
    case 'translator': return <TranslatorScreen navigate={navigate} />;
    default:           return <WelcomeScreen  navigate={navigate} />;
  }
}