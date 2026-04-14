import { Package } from "lucide-react";

import { AdminSectionPage } from "../_components/admin-section-page";

export default function AdminPackagePage() {
  return (
    <AdminSectionPage
      title="Package Management"
      description="Manage package pricing, duration, checkout URLs, and entitlement sets before they are used by subscriptions and CD-Key issuance."
      icon={Package}
    />
  );
}
