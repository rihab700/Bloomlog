import { TokenResponse, UserPublic } from "../types";
import { apiRequest } from "./client";

export async function loginUser(email: string, password: string) {
  return apiRequest<TokenResponse>("/login/access-token", {
    method: "POST",
    body: new URLSearchParams({ username: email, password }),
  }, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export async function fetchCurrentUser(token: string) {
  return apiRequest<UserPublic>("/login/test-token", { method: "POST" }, { token });
}

export async function registerUser(email: string, password: string, fullName?: string) {
  return apiRequest<UserPublic>("/users/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}
