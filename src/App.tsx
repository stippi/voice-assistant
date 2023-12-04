import './App.css';
import {SettingsProvider} from "./contexts/SettingsContext";
import VoiceAssistant from "./components/VoiceAssistant";
import useWindowFocus from "./hooks/useWindowFocus.tsx";

export default function App() {
  
  useWindowFocus();
  
  return (
    <SettingsProvider>
      <VoiceAssistant />
    </SettingsProvider>
  );
}
