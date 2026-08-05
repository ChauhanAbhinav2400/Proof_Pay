import axios from "axios";
import type { ApiErrorResponse } from "../types/api";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) return error.response?.data.message ?? error.response?.data.error ?? fallback;
  return error instanceof Error ? error.message : fallback;
}
