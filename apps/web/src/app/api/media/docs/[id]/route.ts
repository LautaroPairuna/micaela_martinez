// apps/web/src/app/api/media/docs/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

// Función para validar el token de sesión
async function validateSession(): Promise<boolean> {
  try {
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    
    if (!token) {
      return false;
    }

    // Validar token contra el backend
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
      .trim()
      .replace(/\/+$/, '')
      .replace('://localhost', '://127.0.0.1');
    
    const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
    
    const response = await fetch(`${apiUrl}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.error('[DOCS-PROXY] Session validation error:', error);
    return false;
  }
}

// Función para obtener información del archivo de documento
function getDocumentPath(docId: string): string {
  // Sanitizar el ID para prevenir path traversal
  const sanitizedId = docId.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Construir ruta al archivo
  const publicDir = join(process.cwd(), 'public', 'docs');
  return join(publicDir, sanitizedId);
}

// Función para determinar el tipo MIME
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    case 'rtf':
      return 'application/rtf';
    case 'odt':
      return 'application/vnd.oasis.opendocument.text';
    default:
      return 'application/pdf';
  }
}

// Función para obtener el nombre de archivo para descarga
function getDownloadFilename(docId: string): string {
  // Remover caracteres especiales pero mantener extensión
  return docId.replace(/[^a-zA-Z0-9._-]/g, '');
}

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: Context) {
  try {
    // Validar sesión del usuario
    const isValidSession = await validateSession();
    if (!isValidSession) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Obtener el ID del documento
    const { id } = await context.params;
    if (!id) {
      return new NextResponse('Document ID required', { status: 400 });
    }

    // Obtener ruta del archivo
    const docPath = getDocumentPath(id);
    
    // Verificar que el archivo existe
    try {
      const stats = await stat(docPath);
      if (!stats.isFile()) {
        return new NextResponse('Document not found', { status: 404 });
      }
    } catch (error) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // Leer el archivo
    const fileBuffer = await readFile(docPath);
    const stats = await stat(docPath);
    const mimeType = getMimeType(id);
    const downloadFilename = getDownloadFilename(id);

    // Verificar si es una solicitud de descarga
    const isDownload = req.nextUrl.searchParams.get('download') === 'true';
    
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN'
    };

    if (isDownload) {
      // Forzar descarga
      headers['Content-Disposition'] = `attachment; filename="${downloadFilename}"`;
    } else {
      // Mostrar en línea (para PDFs principalmente)
      headers['Content-Disposition'] = `inline; filename="${downloadFilename}"`;
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('[DOCS-PROXY] Document serving error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Endpoint HEAD para obtener metadatos sin descargar el archivo
export async function HEAD(req: NextRequest, context: Context) {
  try {
    // Validar sesión del usuario
    const isValidSession = await validateSession();
    if (!isValidSession) {
      return new NextResponse(null, { status: 401 });
    }

    // Obtener el ID del documento
    const { id } = await context.params;
    if (!id) {
      return new NextResponse(null, { status: 400 });
    }

    // Obtener ruta del archivo
    const docPath = getDocumentPath(id);
    
    // Verificar que el archivo existe
    try {
      const stats = await stat(docPath);
      if (!stats.isFile()) {
        return new NextResponse(null, { status: 404 });
      }

      const mimeType = getMimeType(id);
      const downloadFilename = getDownloadFilename(id);
      
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Disposition': `inline; filename="${downloadFilename}"`
        }
      });
    } catch (error) {
      return new NextResponse(null, { status: 404 });
    }
  } catch (error) {
    console.error('[DOCS-PROXY] Document HEAD error:', error);
    return new NextResponse(null, { status: 500 });
  }
}