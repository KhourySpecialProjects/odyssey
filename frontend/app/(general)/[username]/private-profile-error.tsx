"use client";

import { useRouter } from "next/navigation";
import LockOutlineIcon from "@mui/icons-material/LockOutline";

export function PrivateProfileError() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="max-w-md text-center">
        <button
          onClick={() => router.back()}
          className="mb-8 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <span className="text-lg">←</span>
          Back
        </button>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
          <LockOutlineIcon className="h-10 w-10 text-gray-500 dark:text-gray-300" />
        </div>

        <h1 className="mb-4 text-4xl font-bold text-gray-800 dark:text-gray-200">
          Profile Not Found
        </h1>

        <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
          This profile is either private or does not exist.
        </p>

        <button
          onClick={() => router.push("/feed")}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Return to Feed
        </button>
      </div>
    </div>
  );
}
