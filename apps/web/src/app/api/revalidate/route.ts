import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const { paths } = await request.json();
    
    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json(
        { error: 'Paths array is required' },
        { status: 400 }
      );
    }

    // Revalidar cada path proporcionado
    for (const path of paths) {
      if (typeof path === 'string') {
        revalidatePath(path);
        console.log(`[REVALIDATE] Revalidated path: ${path}`);
      }
    }

    return NextResponse.json({ 
      message: 'Cache revalidated successfully',
      paths: paths.filter(p => typeof p === 'string')
    });
  } catch (error) {
    console.error('[REVALIDATE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate cache' },
      { status: 500 }
    );
  }
}