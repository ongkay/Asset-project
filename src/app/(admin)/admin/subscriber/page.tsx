import { UserCog } from "lucide-react";

import { AdminSectionPage } from "../_components/admin-section-page";

export default function AdminSubscriberPage() {
  return (
    <AdminSectionPage
      title="Subscriber Management"
      description="Review subscription status, adjust assignments, and prepare manual overrides for operational changes."
      icon={UserCog}
    />
  );
}
