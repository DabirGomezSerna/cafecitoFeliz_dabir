import axios from "axios";

const apiClient = axios.create({
  // Create React App inlines REACT_APP_* at build time and does NOT hot-reload
  // .env — restart `npm start` after changing it.
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },

  /**
   * Required for the session to work at all.
   *
   * The auth token lives in an httpOnly cookie, and the browser will neither
   * store nor send it on a cross-origin request unless credentials are enabled
   * here AND the server replies with an explicit origin plus
   * Access-Control-Allow-Credentials. If every call 401s right after a login that
   * appeared to succeed, this flag is the first thing to check.
   */
  withCredentials: true,
});

function classifyError(error) {
  if (error.response) {
    const status = error.response.status;
    if (status === 404) return { kind: "NOT_FOUND", status, original: error };
    if (status === 401)
      return { kind: "UNAUTHORIZED", status, original: error };
    if (status === 403) return { kind: "FORBIDDEN", status, original: error };
    if (status === 409) return { kind: "CONFLICT", status, original: error };
    if (status === 422)
      return {
        kind: "VALIDATION",
        status,
        fields: error.response.data?.errors,
        original: error,
      };
    if (status === 500)
      return { kind: "SERVER_ERROR", status, original: error };

    return { kind: "CLIENT_ERROR", status, original: error };
  }

  if (error.code === "ECONNABORTED") {
    return { kind: "TIMEOUT", original: error };
  }

  if (error.request) {
    return { kind: "NETWORK", original: error };
  }

  return { kind: "UNKNOWN", original: error };
}

/**
 * Rejects with a classified object rather than an AxiosError, so callers branch
 * on `kind` instead of poking at response internals.
 *
 * There is deliberately NO global 401 -> redirect here. Two reasons: it would
 * hijack the login form's own 401 handling, turning "wrong password" into a
 * bounce back to /login with no explanation; and AuthContext's startup probe of
 * /auth/me is *expected* to 401 for a visitor who is not signed in. 401 is
 * handled in AuthContext and in the forms, nowhere else.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const classified = classifyError(error);
    // A 401 from the session probe is normal; don't shout about it.
    const isExpectedProbe =
      classified.status === 401 && error.config?.url?.includes("/auth/me");
    if (!isExpectedProbe) {
      console.error(`[API ${classified.kind}]`, classified);
    }
    return Promise.reject(classified);
  },
);

/** Read the backend's `code` out of a classified error, when present. */
export const errorCode = (classified) =>
  classified?.original?.response?.data?.code ?? null;

/** Read the backend's human message out of a classified error, when present. */
export const errorMessage = (classified) =>
  classified?.original?.response?.data?.message ?? null;

/** Read the backend's `details` out of a classified error, when present. */
export const errorDetails = (classified) =>
  classified?.original?.response?.data?.details ?? null;

export default apiClient;
