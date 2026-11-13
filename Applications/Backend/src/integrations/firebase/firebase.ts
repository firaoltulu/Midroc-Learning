import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

function auth() {
  const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
  return getAuth(app);
}

export function verifyIdToken(token: string): Promise<DecodedIdToken> {
  return auth().verifyIdToken(token);
}

export async function setRoleClaim(
  uid: string,
  role: 'user' | 'admin'
): Promise<void> {
  const admin = auth();
  const user = await admin.getUser(uid);
  await admin.setCustomUserClaims(uid, { ...user.customClaims, role });
}

export function revokeSessions(uid: string): Promise<void> {
  return auth().revokeRefreshTokens(uid);
}
