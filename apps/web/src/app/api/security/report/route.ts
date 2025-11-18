import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Validar sesión del usuario
async function validateSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mp_session');
    
    if (!sessionCookie?.value) {
      return { valid: false };
    }

    // Validar con el backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie.value}`
      }
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return { valid: true, userId: data.user?.id };
  } catch (error) {
    console.error('Error validating session:', error);
    return { valid: false };
  }
}

// Rate limiting para reportes
const reportLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkReportRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxReports = 10; // Máximo 10 reportes por minuto
  
  const current = reportLimitMap.get(identifier);
  
  if (!current || now > current.resetTime) {
    reportLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxReports) {
    return false;
  }
  
  current.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Validar sesión
    const sessionResult = await validateSession();
    if (!sessionResult.valid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkReportRateLimit(clientIP)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    const body = await req.json();
    const { type, userId, videoId, timestamp, details } = body;

    // Validar datos requeridos
    if (!type || !userId || !timestamp) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Validar que el userId coincida con la sesión
    if (userId !== sessionResult.userId?.toString()) {
      return new NextResponse('User ID mismatch', { status: 403 });
    }

    // Log del evento de seguridad
    const securityEvent = {
      type,
      userId,
      videoId,
      timestamp,
      details,
      clientIP,
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      reportedAt: new Date().toISOString()
    };

    // En un entorno de producción, esto se guardaría en una base de datos
    // y se podrían enviar alertas a los administradores
    console.warn('🚨 Security Event Reported:', JSON.stringify(securityEvent, null, 2));

    // Aquí podrías:
    // 1. Guardar en base de datos
    // 2. Enviar alerta por email/Slack
    // 3. Incrementar contador de infracciones del usuario
    // 4. Bloquear temporalmente al usuario si hay muchas infracciones

    return new NextResponse(JSON.stringify({ 
      success: true, 
      message: 'Security event reported successfully' 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error processing security report:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Método GET para obtener estadísticas de seguridad (solo para admins)
export async function GET() {
  try {
    // Validar sesión y permisos de admin
    const sessionResult = await validateSession();
    if (!sessionResult.valid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Aquí validarías si el usuario es admin
    // Por ahora, retornamos estadísticas básicas
    const stats = {
      totalReports: 0, // Obtener de base de datos
      reportsByType: {}, // Obtener de base de datos
      recentReports: [] // Obtener de base de datos
    };

    return new NextResponse(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error getting security stats:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}