import {
  err,
  errAsync,
  ok,
  okAsync,
  type Result,
  ResultAsync,
} from "neverthrow"

// Services return Result values instead of throwing. The error channel is for
// things that went wrong (missing rows, invalid input, an integration being
// down). A business rule answering "no" is not an error: model it as a
// discriminated union in the Ok channel with a `reason`.

export const appErrorCodeList = [
  "NOT_FOUND",
  "VALIDATION",
  "INVALID_STATE",
  "INTEGRATION_FAILED",
] as const
export type AppErrorCode = (typeof appErrorCodeList)[number]

export type AppError = {
  code: AppErrorCode
  message: string
}

export const appError = (code: AppErrorCode, message: string): AppError => ({
  code,
  message,
})

export const notFound = (what: string, id: string) =>
  appError("NOT_FOUND", `${what} ${id} not found`)

export type AppResult<T> = Result<T, AppError>
export type AppResultAsync<T> = ResultAsync<T, AppError>

/** Wrap a promise so a rejection becomes an AppError instead of a throw. */
export const fromPromise = <T>(
  promise: Promise<T>,
  code: AppErrorCode,
  message: string,
): AppResultAsync<T> =>
  ResultAsync.fromPromise(promise, (cause) =>
    appError(
      code,
      `${message}: ${cause instanceof Error ? cause.message : cause}`,
    ),
  )

export type { Result }
export { err, errAsync, ok, okAsync, ResultAsync }
