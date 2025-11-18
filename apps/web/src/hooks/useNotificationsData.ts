'use client';

import { useQuery } from '@tanstack/react-query';
import { apiProxy } from '@/lib/api-proxy';
import type { Notification as AppNotification } from '@/contexts/NotificationsContext';

type NotificationsMeta = { page: number; limit: number; total: number; lastPage: number };
type NotificationsListResponse = { data: AppNotification[]; meta: NotificationsMeta };
type UnreadCountResponse = { count: number };

export function useNotificationsData({ page = 1, onlyUnread = false, enabled = true }:
  { page?: number; onlyUnread?: boolean; enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['notifications', { page, onlyUnread }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(20), onlyUnread: String(onlyUnread) });
      const [list, unread] = await Promise.all([
        apiProxy<NotificationsListResponse>(`/notifications?${params.toString()}`),
        apiProxy<UnreadCountResponse>('/notifications/unread-count'),
      ]);
      return { notifications: list.data, pagination: list.meta, unreadCount: unread.count };
    },
    enabled,
    staleTime: 30_000,
  });

  return query;
}