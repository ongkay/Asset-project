import { Users } from "lucide-react";

import { AdminSectionPage } from "../_components/admin-section-page";

export default function AdminUsersPage() {
  return (
    <AdminSectionPage
      title="User Management"
      description="Create users, ban or unban accounts, change passwords, and inspect account details."
      icon={Users}
    />
  );
}
