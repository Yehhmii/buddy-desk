/** Errors whose message is safe to show to the user. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export class NotFoundError extends UserFacingError {
  constructor(what: string) {
    super(`${what} was not found.`);
    this.name = 'NotFoundError';
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  return 'Something went wrong. Check the log file for details.';
}
