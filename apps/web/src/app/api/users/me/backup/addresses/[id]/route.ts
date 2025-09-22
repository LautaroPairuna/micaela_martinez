import { NextRequest } from 'next/server';
import { proxy } from '../../../../../_proxy'; // 4 niveles por el [id]

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(req, `/users/me/addresses/${id}`);
}
