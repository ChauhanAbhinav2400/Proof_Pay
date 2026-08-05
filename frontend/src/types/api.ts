export interface ApiErrorResponse {
  success?: false;
  message?: string;
  error?: string;
}

export interface PaginationOptions {
  limit?: number;
  skip?: number;
}
