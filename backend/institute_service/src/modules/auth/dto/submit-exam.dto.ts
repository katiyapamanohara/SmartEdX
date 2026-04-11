import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitExamDto {
  /** Map of questionId → option index (MCQ) or answer text (essay) */
  @ApiProperty({ example: { q1: 2, q2: 'The answer is...' } })
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, number | string>;
}
