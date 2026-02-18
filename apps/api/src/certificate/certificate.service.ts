import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../media/media-storage.service';
import puppeteer from 'puppeteer';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { CertificateTemplate } from './templates/CertificateTemplate';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async generateCertificate(userId: number, courseId: number) {
    // 0. Verificar si ya existe un certificado
    const existingCert = await this.prisma.certificado.findUnique({
      where: {
        usuarioId_cursoId: {
          usuarioId: userId,
          cursoId: courseId,
        },
      },
    });

    if (existingCert) {
      // Si existe, intentar leer el archivo y retornarlo
      // La URL guardada es relativa: /media/uploads/certificates/cert-xxx.pdf
      // Necesitamos el path físico para leer el buffer y enviarlo al usuario
      // O podríamos devolver solo la URL y que el frontend lo descargue (redirect).
      // Pero el controlador actual espera devolver un buffer.
      
      try {
        const buffer = await this.mediaStorage.getFile(existingCert.url);
        
        return {
          buffer,
          filename: existingCert.url.split('/').pop() || 'certificado.pdf',
          url: existingCert.url
        };
      } catch (error) {
        this.logger.warn(`Certificado registrado pero archivo no encontrado: ${existingCert.url}. Se regenerará.`);
        // Si falla la lectura, procedemos a regenerar
      }
    }

    // 1. Obtener inscripción y curso con estructura completa
    const enrollment = await this.prisma.inscripcion.findUnique({
      where: {
        usuarioId_cursoId: {
          usuarioId: userId,
          cursoId: courseId,
        },
      },
      include: {
        usuario: true,
        curso: {
          include: {
            modulos: {
              include: {
                lecciones: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    // 2. Validar progreso del 100%
    const progress = (enrollment.progreso as any) || {};
    let totalLessons = 0;
    let completedLessons = 0;

    for (const modulo of enrollment.curso.modulos) {
      for (const leccion of modulo.lecciones) {
        totalLessons++;
        
        // Verificar si está completada en el JSON de progreso
        // Estructura esperada: progreso[moduleId][lessonId] exists/completed
        const modProg = progress[String(modulo.id)];
        if (modProg) {
          const lessonProg = modProg[String(leccion.id)];
          if (lessonProg && (lessonProg === true || lessonProg.completed)) {
            completedLessons++;
          }
        }
      }
    }

    const percentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    
    // Permitir un pequeño margen de error o requerir 100% estricto?
    // Usaremos 100% estricto, o > 99% por temas de redondeo si fuera float
    if (Math.round(percentage) < 100) {
       throw new BadRequestException(`El curso no está completado. Progreso actual: ${percentage.toFixed(1)}%`);
    }

    // 3. Generar HTML
    const userName = enrollment.usuario.nombre || enrollment.usuario.email;
    const courseName = enrollment.curso.titulo;
    const completionDate = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const htmlContent = this.getCertificateHtml(userName, courseName, completionDate);

    // 4. Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    await browser.close();

    // 5. Guardar en disco usando MediaStorageService
    const savedFile = await this.mediaStorage.saveRawFile({
        buffer: Buffer.from(pdfBuffer),
        originalname: `Certificado-${this.sanitizeFilename(courseName)}.pdf`,
        mimetype: 'application/pdf',
        size: pdfBuffer.length
    }, {
        folder: 'uploads/certificates',
        baseName: `cert-${this.sanitizeFilename(courseName)}-${this.sanitizeFilename(userName)}`
    });

    // 6. Guardar registro en BD
    await this.prisma.certificado.upsert({
        where: {
            usuarioId_cursoId: {
                usuarioId: userId,
                cursoId: courseId
            }
        },
        create: {
            usuarioId: userId,
            cursoId: courseId,
            url: savedFile.url,
            uuid: crypto.randomUUID()
        },
        update: {
            url: savedFile.url,
            creadoEn: new Date() // actualizar fecha si se regenera
        }
    });

    return {
        buffer: pdfBuffer,
        filename: savedFile.originalName,
        url: savedFile.url
    };
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  private getCertificateHtml(studentName: string, courseName: string, date: string): string {
    const component = React.createElement(CertificateTemplate, {
      studentName,
      courseName,
      date
    });
    const bodyHtml = renderToStaticMarkup(component);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificado - ${studentName}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                gold: {
                  DEFAULT: '#D4AF37',
                  light: '#F4CF57',
                  dark: '#B48F17',
                }
              },
              fontFamily: {
                serif: ['Playfair Display', 'serif'],
                sans: ['Lato', 'sans-serif'],
              }
            }
          }
        }
      </script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .bg-dots {
          background-image: radial-gradient(#f5f5f5 1px, transparent 1px);
          background-size: 20px 20px;
        }
      </style>
    </head>
    <body class="bg-[#fdfbf7] flex justify-center items-center h-screen m-0 p-0 font-sans text-gray-800">
      ${bodyHtml}
    </body>
    </html>
    `;
  }
}
