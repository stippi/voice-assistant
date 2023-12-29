import './App.css';
import {SettingsProvider} from "./contexts/SettingsContext";
import VoiceAssistant from "./components/VoiceAssistant";
import useWindowFocus from "./hooks/useWindowFocus.tsx";
import {ChatsProvider} from "./contexts/ChatsContext.tsx";

export default function App() {
  
  useWindowFocus();
  
  return (
    <SettingsProvider>
      <ChatsProvider>
        <VoiceAssistant />
      </ChatsProvider>
    </SettingsProvider>
  );
}
