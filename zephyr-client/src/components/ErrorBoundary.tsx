import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold text-red-600">Oops!</h1>
        <p className="mt-2">Sorry, an unexpected error has occurred.</p>
        <p className="mt-1 text-gray-600">
          <i>
            {error.status} {error.statusText}
          </i>
        </p>
        {error.data?.message && (
          <p className="mt-2 text-sm text-gray-500">{error.data.message}</p>
        )}
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold text-red-600">Oops!</h1>
        <p className="mt-2">Sorry, an unexpected error has occurred.</p>
        <p className="mt-1 text-gray-600">
          <i>{error.message}</i>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold text-red-600">Oops!</h1>
      <p className="mt-2">Sorry, an unexpected error has occurred.</p>
    </div>
  );
}
