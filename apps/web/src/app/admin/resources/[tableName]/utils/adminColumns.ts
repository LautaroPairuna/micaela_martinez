export function getDefaultColumns<
  T extends Record<string, readonly string[]>
>(mapa: T, resource: string): string[] | undefined {
  const ro = mapa[resource as keyof T] as readonly string[] | undefined
  return ro ? Array.from(ro) : undefined // copia mutable para TS
}

export function getHiddenColumns<
  T extends Record<string, readonly string[]>
>(mapa: T, resource: string): readonly string[] {
  const ro = mapa[resource as keyof T] as readonly string[] | undefined
  return ro ?? ([] as const) // evita inferir never[]
}
