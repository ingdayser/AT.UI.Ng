export interface PagedRequest {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGED_REQUEST: PagedRequest = { page: 1, pageSize: 25 };

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
