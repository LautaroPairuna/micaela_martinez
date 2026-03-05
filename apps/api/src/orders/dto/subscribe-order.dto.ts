import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SubscribeOrderDto {
  // card_token_id para preapproval
  @IsString()
  card_token_id!: string;

  @IsString()
  payer_email!: string;

  @IsOptional()
  payer_identification?: { type: string; number: string };

  @IsOptional()
  device_session_id?: string;

  // frecuencia (ej: 1 month)
  @IsInt()
  @Min(1)
  frequency!: number;

  @IsString()
  frequency_type!: 'days' | 'months';

  // attemptId
  @IsString()
  attemptId!: string;
}