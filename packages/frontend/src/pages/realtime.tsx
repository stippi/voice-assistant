import { AssistantWithOptionalIntegrations } from "../components/AssistantWithOptionalIntegrations";
import RealTimeAssistant from "../components/RealTimeAssistant";
import { Sidebar } from "../components/sidebar/Sidebar";
import { Dashboard } from "../components/dashboard/Dashboard";

export default function RealTimePage() {
  return (
    <AssistantWithOptionalIntegrations>
      <Sidebar />
      <RealTimeAssistant />
      <Dashboard />
    </AssistantWithOptionalIntegrations>
  );
}
