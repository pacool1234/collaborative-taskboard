export interface ApiError {
  error: {
    status: number;
    message: string;
    details?: string[];
  };
}

export interface ApiData<T> {
  data: T;
}

export interface Pagination {
  limit: number;
  offset: number;
  count: number;
}

export interface ApiPaginated<T> extends ApiData<T[]> {
  pagination: Pagination;
}
