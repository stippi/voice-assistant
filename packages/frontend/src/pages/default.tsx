import { OptionalIntegrations } from "../components/OptionalIntegrations";
import VoiceAssistant from "../components/VoiceAssistant";
import { Sidebar } from "../components/sidebar/Sidebar";
import { Dashboard } from "../components/dashboard/Dashboard";
import { useAppContext, useSettings } from "../hooks";

export default function DefaultPage() {
  const { settings } = useSettings();
  const { idle } = useAppContext();

  const idleMode = idle && settings.enableGoogle && settings.enableGooglePhotos;

  return (
    <OptionalIntegrations>
      <Sidebar />
      <VoiceAssistant idle={idleMode} />
      <Dashboard />
    </OptionalIntegrations>
  );
}
