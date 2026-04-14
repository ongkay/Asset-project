import { KeyRound } from "lucide-react";

import { AdminSectionPage } from "../_components/admin-section-page";

export default function AdminCdKeyPage() {
  return (
    <AdminSectionPage
      title="CD-Key Management"
      description="Issue reusable CD-Keys, inspect usage history, and keep key distribution tied to active packages."
      icon={KeyRound}
    />
  );
}
