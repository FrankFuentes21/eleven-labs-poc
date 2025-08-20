import { Body, Controller, Get, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { IntegrationsService } from './integrations.service';
import { ElevenLabsInputDto } from './dtos/requests/eleven-labs-input';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('text-to-speech')
  async convertToVoice(@Body() data: ElevenLabsInputDto, @Res() res: Response,): Promise<any> {
    const stream = await this.integrationsService.convertToVoice(data);

    const filename = data.filename || 'speech.mp3';

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    stream.pipe(res);
  }

  @Post('speech-to-text')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    const text = await this.integrationsService.convertToText(file);
    return { text };
  }

}