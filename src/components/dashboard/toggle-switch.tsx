"use client";

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  loading?: boolean;
};

export function ToggleSwitch({ enabled, onChange, loading }: Props) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
        enabled ? "bg-blue-600" : "bg-zinc-200"
      }`}
    >
      <span
        className={`inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
