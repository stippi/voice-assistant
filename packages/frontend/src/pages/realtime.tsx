import { OptionalIntegrations } from "../components/OptionalIntegrations";
import RealTimeAssistant from "../components/RealTimeAssistant";
import { Dashboard } from "../components/dashboard/Dashboard";

export default function RealTimePage() {
  return (
    <OptionalIntegrations>
      <RealTimeAssistant />
      <Dashboard idle={false} />
    </OptionalIntegrations>
  );
}
