/**
 * Translate a Server Action's `ActionResult.error` string into the same
 * `Error & { response: { status } }` shape that axios produces, so call
 * sites that pattern-match on `(err as ...).response.status` keep working
 * unchanged after services swap their internals from axios to actions.
 */
export function actionError(error: string): never {
  const map: Record<string, number> = {
    Unauthorized: 401,
    Forbidden: 403,
    NotFound: 404,
  };
  const status = map[error] ?? 500;
  const err = new Error(error) as Error & { response?: { status: number } };
  err.response = { status };
  throw err;
}
