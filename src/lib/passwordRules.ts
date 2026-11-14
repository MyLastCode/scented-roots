// One place for the password requirements, used by Sign Up and Reset Password.
// You can also turn on a matching password policy in the Firebase console
// (Authentication > Settings > Password policy) so the server enforces it too.

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`;

// Returns a message describing what's wrong, or null if the password is OK.
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  // /[a-z]/i is a regular expression: "any letter a to z, ignoring case".
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return "Password needs at least one letter and one number.";
  }
  return null;
}
