// Password rules (pure, unit-tested).

export const MIN_PASSWORD = 8;

/** Checks the "change my password" form. Returns an error message, or null when the new password is acceptable. */
export function validatePasswordChange(current: string, next: string, confirm: string): string | null {
  if (!current) return "Enter your current password";
  if (next.length < MIN_PASSWORD) return `New password must be at least ${MIN_PASSWORD} characters`;
  if (next !== confirm) return "The new passwords don't match";
  if (next === current) return "Choose a password different from your current one";
  return null;
}
