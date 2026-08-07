import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

export interface OAuthProfile {
  providerId: string;
  email: string;
  name: string;
}

/**
 * Verifies a Google ID token (obtained client-side via Google Identity Services)
 * and returns the verified profile.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  if (!env.googleClientId || !googleClient) {
    throw ApiError.badRequest(
      "Google Sign-In is not configured on this server. Set GOOGLE_CLIENT_ID."
    );
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw ApiError.unauthorized("Invalid Google token");
  }

  return {
    providerId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
  };
}

/**
 * Verifies a "Sign in with Apple" identity token from the client.
 */
export async function verifyAppleIdToken(
  identityToken: string,
  fullName?: string
): Promise<OAuthProfile> {
  if (!env.apple.clientId) {
    throw ApiError.badRequest(
      "Sign in with Apple is not configured on this server. Set APPLE_CLIENT_ID."
    );
  }

  const result = await appleSignin.verifyIdToken(identityToken, {
    audience: env.apple.clientId,
    ignoreExpiration: false,
  });

  if (!result.sub) {
    throw ApiError.unauthorized("Invalid Apple token");
  }

  return {
    providerId: result.sub,
    email: result.email ?? `${result.sub}@privaterelay.apple`,
    name: fullName ?? "Apple User",
  };
}
