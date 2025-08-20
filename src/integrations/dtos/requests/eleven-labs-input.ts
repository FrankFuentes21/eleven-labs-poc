import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ElevenLabsInputDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
