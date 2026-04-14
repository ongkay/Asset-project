import { History } from "lucide-react";

import { AdminSectionPage } from "../_components/admin-section-page";

export default function AdminUserLogsPage() {
  return (
    <AdminSectionPage
      title="User Activity"
      description="Review login history, extension activity, and transaction records in one read-only view."
      icon={History}
    />
  );
}
