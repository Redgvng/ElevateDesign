export type Project = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  defaultDesignSystemId: string | null;
};

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "JOB_FAILED"
  | "AI_PROVIDER_ERROR"
  | "RENDER_ERROR"
  | "EXPORT_ERROR"
  | "RATE_LIMITED"
  | "UNAUTHORIZED";

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};
