import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PaginationQuery {
  @ApiProperty({
    required: false,
    minimum: 1,
    default: 1,
    description: 'Page number (1-based index)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  @Type(() => Number)
  page: number = 1;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 1000,
    default: 100,
    description: 'Number of items per page',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  pagesize: number = 100;
}

export default PaginationQuery;
