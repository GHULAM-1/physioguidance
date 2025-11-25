export type ErrorWithName = Error & {
  name: string;
};

export function isErrorWithName(error: unknown): error is ErrorWithName {
  return (
    error instanceof Error && typeof (error as ErrorWithName).name === 'string'
  );
}

export function getErrorName(error: unknown): string {
  if (isErrorWithName(error)) return error.name;
  return 'UnknownError';
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
