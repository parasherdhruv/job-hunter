import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Shared pagination query parameters. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export interface NormalizedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function normalizePagination(query: PaginationQueryDto): NormalizedPagination {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
