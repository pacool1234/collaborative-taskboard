export type RequestLocation = "body" | "params" | "query";

/** One problem with the request, addressable by the client (e.g. shown next to a form field). */
export interface ValidationIssue {
  location: RequestLocation;
  /** Dot-separated path to the offending field; absent when the whole location is invalid. */
  field?: string;
  message: string;
}

export interface ApiError {
  error: {
    status: number;
    message: string;
    details?: ValidationIssue[];
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
