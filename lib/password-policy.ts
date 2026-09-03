export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_POLICY_MESSAGE =
  "비밀번호는 영문+숫자 조합 6자 이상이어야 합니다.";

export function isValidPassword(password: string) {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
