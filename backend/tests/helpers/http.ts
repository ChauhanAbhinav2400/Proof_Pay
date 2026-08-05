import type { Express } from "express";
import request, { type Response, type Test } from "supertest";

export const JSON_HEADERS = Object.freeze({
  Accept: "application/json",
  "Content-Type": "application/json"
});

export function createRequest(app: Express) {
  return request(app);
}

export function withJson(test: Test): Test {
  return test.set(JSON_HEADERS);
}

export function withAuthentication(test: Test, token: string): Test {
  return test.set("Authorization", `Bearer ${token}`);
}

export function createAuthenticatedRequest(app: Express, token: string): {
  get(path: string): Test;
  post(path: string): Test;
  patch(path: string): Test;
  put(path: string): Test;
  delete(path: string): Test;
} {
  const client = createRequest(app);
  const authenticated = (test: Test): Test => withAuthentication(withJson(test), token);

  return {
    get: (path) => authenticated(client.get(path)),
    post: (path) => authenticated(client.post(path)),
    patch: (path) => authenticated(client.patch(path)),
    put: (path) => authenticated(client.put(path)),
    delete: (path) => authenticated(client.delete(path))
  };
}

export function expectJsonResponse(response: Response, status: number): void {
  if (response.status !== status) {
    throw new Error(`Expected HTTP ${status}, received ${response.status}.`);
  }

  if (!response.headers["content-type"]?.includes("application/json")) {
    throw new Error("Expected a JSON response.");
  }
}
