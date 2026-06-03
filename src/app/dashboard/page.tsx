"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, apiFetch, hasRole } from "@/lib/auth-client";
import { ToggleSwitch } from "@/components/dashboard/toggle-switch";

type DashboardInfo = {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  widgetCount: number;
  createdAt: string;
};

type FeatureFlag = {
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardInfo[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const isAdmin = hasRole("admin");
    const requests: Promise<unknown>[] = [
      apiFetch<{ dashboards: DashboardInfo[] }>("/api/dashboards"),
    ];

    if (isAdmin) {
      requests.push(apiFetch<{ flags: FeatureFlag[] }>("/api/feature-flags"));
    }

    Promise.all(requests)
      .then(([dashData, flagData]) => {
        setDashboards((dashData as { dashboards: DashboardInfo[] }).dashboards);
        if (flagData && "flags" in (flagData as Record<string, unknown>)) {
          setFlags((flagData as { flags: FeatureFlag[] }).flags);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleToggle(key: string, enabled: boolean) {
    setToggling((prev) => new Set(prev).add(key));
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));

    try {
      await apiFetch("/api/feature-flags", {
        method: "POST",
        body: JSON.stringify({ flagKey: key, enabled }),
      });
    } catch {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f)));
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800">
            Dashboards ({dashboards.length})
          </h2>
        </div>
        {dashboards.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-400">
            No dashboards yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <h3 className="font-medium text-zinc-900">{d.name}</h3>
                {d.description && (
                  <p className="mt-1 text-sm text-zinc-500">{d.description}</p>
                )}
                <div className="mt-3 flex gap-3 text-xs text-zinc-400">
                  <span>{d.widgetCount} widgets</span>
                  <span className="capitalize">{d.visibility}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-800">
          Feature Flags
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {flags.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5 text-sm"
              >
                <div>
                  <span className="text-zinc-700">{f.name}</span>
                  {f.description && (
                    <p className="mt-0.5 text-xs text-zinc-400">{f.description}</p>
                  )}
                </div>
                <ToggleSwitch
                  enabled={f.enabled}
                  onChange={(val) => handleToggle(f.key, val)}
                  loading={toggling.has(f.key)}
                />
              </div>
          ))}
        </div>
      </section>
    </div>
  );
}
