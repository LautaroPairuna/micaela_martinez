import { Controller, Get, Param, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CertificateService } from './certificate.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user';

@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get('course/:courseId')
  async downloadCertificate(
    @CurrentUser() user: JwtUser,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Res() res: Response,
  ) {
    try {
        const { buffer, filename } = await this.certificateService.generateCertificate(user.sub, courseId);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    } catch (error) {
        if (error instanceof NotFoundException) {
             res.status(404).json({ message: error.message });
        } else {
            // BadRequestException u otros
             res.status(400).json({ message: error instanceof Error ? error.message : 'Error generando certificado' });
        }
    }
  }
}
