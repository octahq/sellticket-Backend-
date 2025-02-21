export interface ServiceResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}
