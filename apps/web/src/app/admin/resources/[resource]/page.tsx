import type { Metadata } from 'next';
import {
  fetchAdminList,
  fetchAllResourcesMeta,
  fetchResourceMeta,
} from '@/lib/admin/fetch-admin-meta';
import { AdminResourceClient } from './AdminResourceClient';
import { AdminToastProvider } from '@/contexts/AdminToastContext';

const PAGE_SIZE = 10;

// 👇 Ojo: con Next 14.2+/15 params/searchParams vienen como Promise
type PageParams = {
  resource: string;
};

type PageSearchParams = {
  page?: string;
  q?: string;
  filters?: string;
};

type PageProps = {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<PageParams> },
): Promise<Metadata> {
  const { resource } = await params;
  const meta = await fetchResourceMeta(resource);
  return {
    title: `Admin – ${meta.displayName}`,
  };
}

export default async function AdminResourcePage({
  params,
  searchParams,
}: PageProps) {
  const { resource } = await params;
  const sp = (await searchParams) ?? {};

  const page = sp.page ? Number(sp.page) : 1;
  const q = sp.q ?? undefined;
  const filters = sp.filters ?? undefined;

  let parsedFilters: Array<{ field: string; op: string; value?: unknown }> | undefined;
  if (filters) {
    try {
      parsedFilters = JSON.parse(filters) as Array<{
        field: string;
        op: string;
        value?: unknown;
      }>;
    } catch {
      parsedFilters = undefined;
    }
  }

  const [meta, list, allResources] = await Promise.all([
    fetchResourceMeta(resource),
    fetchAdminList(resource, {
      page,
      pageSize: PAGE_SIZE,
      q,
      filters: parsedFilters,
    }),
    fetchAllResourcesMeta(),
  ]);

  return (
    <AdminToastProvider>
      <AdminResourceClient
        resource={resource}
        meta={meta}
        initialData={list}
        allResources={allResources}
      />
    </AdminToastProvider>
  );
}
