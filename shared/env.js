// Returns null when the credentials are not set, so the caller can fall back to a manual sign-in.
export function credentials(envNames) {
  const username = process.env[envNames.username];
  const password = process.env[envNames.password];
  return username && password ? { username, password } : null;
}
