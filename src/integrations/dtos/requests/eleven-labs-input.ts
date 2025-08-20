import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ElevenLabsInputDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  filename?: string;
}
