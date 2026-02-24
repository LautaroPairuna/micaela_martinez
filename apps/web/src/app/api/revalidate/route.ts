import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const tag = req.nextUrl.searchParams.get('tag');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
  }

  if (!tag) {
    return NextResponse.json({ message: 'Missing tag' }, { status: 400 });
  }

  // @ts-ignore: Next.js types might be mismatching in this env
  revalidateTag(tag);
  console.log(`[Revalidate] Tag revalidated: ${tag}`);
  
  return NextResponse.json({ revalidated: true, now: Date.now(), tag });
}
