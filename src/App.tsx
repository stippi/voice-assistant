import React from 'react';
import './App.css';
import {SettingsProvider} from "./contexts/SettingsContext";
import VoiceAssistant from "./components/VoiceAssistant";

export default function App() {
  return (
    <SettingsProvider>
      <VoiceAssistant />
    </SettingsProvider>
  );
};
