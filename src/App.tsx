import './App.css';
import {SettingsProvider} from "./contexts/SettingsContext";
import {TimersProvider} from "./contexts/TimersContext";
import VoiceAssistant from "./components/VoiceAssistant";

export default function App() {
  return (
    <SettingsProvider>
      <TimersProvider>
        <VoiceAssistant />
      </TimersProvider>
    </SettingsProvider>
  );
}
