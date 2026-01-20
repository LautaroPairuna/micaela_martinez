// apps/web/src/app/admin/page.tsx
import 'server-only';

import { fetchDashboardOverview } from '@/lib/admin/fetch-admin-dashboard';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  // Puede devolver DashboardSummary | null | undefined
  const summary = await fetchDashboardOverview();

  // El client ya se defiende internamente con un EMPTY_SUMMARY
  return <AdminDashboardClient summary={summary} />;
}
