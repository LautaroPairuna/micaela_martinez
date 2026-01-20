import { NextRequest } from 'next/server';
import { proxy } from '../../../../_proxy';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return proxy(req, `/users/me/favorites/${productId}`);
}
