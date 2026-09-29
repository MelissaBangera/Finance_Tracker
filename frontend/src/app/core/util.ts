import { HttpErrorResponse } from '@angular/common/http';

export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
export const PASSWORD_HINT = '8-64 characters with upper case, lower case and a number';

export function errMsg(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Cannot reach the server. Is the API running?';
    return e.error?.message || 'Something went wrong. Try again.';
  }
  return 'Something went wrong. Try again.';
}
