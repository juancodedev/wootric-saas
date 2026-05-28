"use client";

type Props = {
  status: "idle" | "testing" | "ok" | "error";
  message: string;
  onTest: () => void;
};

export function ConnectionTest({ status, message, onTest }: Props) {
  const variants = {
    idle: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
    testing: "bg-blue-50 text-blue-600 cursor-wait",
    ok: "bg-green-50 text-green-700",
    error: "bg-red-50 text-red-600",
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={status === "testing"}
        onClick={onTest}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variants[status]}`}
      >
        {status === "idle" && "Test Connection"}
        {status === "testing" && "Testing..."}
        {status === "ok" && "Re-test Connection"}
        {status === "error" && "Retry Connection"}
      </button>

      {status !== "idle" && message && (
        <p
          className={`text-sm ${
            status === "ok" ? "text-green-600" : status === "error" ? "text-red-600" : "text-blue-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
