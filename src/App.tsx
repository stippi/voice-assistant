import './App.css';
import {SettingsProvider} from "./contexts/SettingsContext";
import VoiceAssistant from "./components/VoiceAssistant";
import {ChatsProvider} from "./contexts/ChatsContext.tsx";
import {Sidebar} from "./components/Sidebar.tsx";
import {WindowFocusProvider} from "./contexts/WindowFocusContext.tsx";
import {AppContextProvider} from "./contexts/AppContext.tsx";

export default function App() {
  return (
    <WindowFocusProvider>
      <AppContextProvider>
        <SettingsProvider>
          <ChatsProvider>
            <Sidebar />
            <VoiceAssistant />
          </ChatsProvider>
        </SettingsProvider>
      </AppContextProvider>
    </WindowFocusProvider>
  );
}
