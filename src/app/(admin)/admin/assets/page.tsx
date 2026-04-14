import { HardDrive } from "lucide-react";

import { AdminSectionPage } from "../_components/admin-section-page";

export default function AdminAssetsPage() {
  return (
    <AdminSectionPage
      title="Assets Management"
      description="Track inventory assets, availability, notes, and operational state for fulfillment and recovery tasks."
      icon={HardDrive}
    />
  );
}
