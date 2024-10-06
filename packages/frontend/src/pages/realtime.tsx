import { OptionalIntegrations } from "../components/OptionalIntegrations";
import RealTimeAssistant from "../components/RealTimeAssistant";
import { Sidebar } from "../components/sidebar/Sidebar";
import { Dashboard } from "../components/dashboard/Dashboard";

export default function RealTimePage() {
  return (
    <OptionalIntegrations>
      <Sidebar />
      <RealTimeAssistant />
      <Dashboard />
    </OptionalIntegrations>
  );
}
