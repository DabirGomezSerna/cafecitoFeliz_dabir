import apiClient from "./apiClient";

/**
 * Staff authentication.
 *
 * None of these functions handle a token: the session lives in an httpOnly
 * cookie that the browser attaches automatically (see withCredentials in
 * apiClient). JavaScript cannot read it, which is the point — it cannot be
 * stolen by injected script either. The consequence is that "am I signed in?"
 * can only be answered by asking the server, which is what me() is for.
 */

/**
 * Create a staff account. The server always assigns the "vendor" role and
 * ignores any role sent here, so this cannot be used to create an admin.
 * Does not sign the new user in.
 */
export async function register({ display_name, email, password }) {
  const response = await apiClient.post("/auth/register", {
    display_name,
    email,
    password,
  });
  return response.data.user;
}

/** Sign in. On success the server sets the session cookie. */
export async function login({ email, password }) {
  const response = await apiClient.post("/auth/login", { email, password });
  return response.data.user;
}

/** Sign out. Idempotent, and safe to call when already signed out. */
export async function logout() {
  await apiClient.post("/auth/logout");
}

/**
 * Who am I? Resolves to the current user, or rejects with a 401 when there is no
 * valid session. The server reads the database here rather than echoing the
 * token, so the role returned is current even if it changed since sign-in.
 */
export async function me() {
  const response = await apiClient.get("/auth/me");
  return response.data.user;
}
