import axios from "axios";
import type { ApiErrorResponse } from "../types/api";

export function getApiErrorMessage(error: unknown, fallback = "Request failed."): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? error.response?.data?.error ?? error.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}
