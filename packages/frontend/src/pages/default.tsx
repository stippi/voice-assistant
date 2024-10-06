import { AssistantWithOptionalIntegrations } from "../components/AssistantWithOptionalIntegrations";
import VoiceAssistant from "../components/VoiceAssistant";
import { Sidebar } from "../components/sidebar/Sidebar";
import { Dashboard } from "../components/dashboard/Dashboard";
import { useAppContext, useSettings } from "../hooks";

export default function DefaultPage() {
  const { settings } = useSettings();
  const { idle } = useAppContext();

  const idleMode = idle && settings.enableGoogle && settings.enableGooglePhotos;

  return (
    <AssistantWithOptionalIntegrations>
      <Sidebar />
      <VoiceAssistant idle={idleMode} />
      <Dashboard />
    </AssistantWithOptionalIntegrations>
  );
}
