import { OptionalIntegrations } from "../components/OptionalIntegrations";
import VoiceAssistant from "../components/VoiceAssistant";
import { Dashboard } from "../components/dashboard/Dashboard";
import { Sidebar } from "../components/sidebar/Sidebar";
import { useAppContext, useSettings } from "../hooks";

export default function DefaultPage() {
  const { settings } = useSettings();
  const { idle } = useAppContext();

  const idleMode = idle && settings.enableGoogle && settings.enableGooglePhotos;

  return (
    <OptionalIntegrations>
      <Sidebar />
      <VoiceAssistant idle={idleMode} />
      <Dashboard idle={idleMode} />
    </OptionalIntegrations>
  );
}
