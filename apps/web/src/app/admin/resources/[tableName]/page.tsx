import type { Metadata } from 'next'
import ResourceDetailClient from './ResourceDetailClient'
export const dynamic = 'force-dynamic'; // o:
export const revalidate = 0;

/** Humaniza nombres: quita 'Cfg', separa camelCase/underscores y capitaliza */
const humanize = (s: string) =>
  s
    .replace(/^Cfg/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())

type Params = { tableName: string }

/** Título base por recurso (ej: CfgMarcas → Admin · Marcas) */
export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { tableName } = await params
  const baseLabel = humanize(tableName)
  return { title: `Admin · Gestion de ${baseLabel}` }
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { tableName } = await params
  return <ResourceDetailClient tableName={tableName} />
}
