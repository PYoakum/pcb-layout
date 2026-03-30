export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

export interface ApiResponse<T> {
  data: T;
}
