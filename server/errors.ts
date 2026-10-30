export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
  }
}
