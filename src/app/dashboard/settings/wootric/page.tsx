"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/auth-client";
import { ConnectionTest } from "@/components/wootric/connection-test";

type TestResult = {
  status: "idle" | "testing" | "ok" | "error";
  message: string;
};

type WootricConfig = {
  apiUrl: string;
  email: string;
  hasPassword: boolean;
  tokenExpiresAt: number | null;
};

type TestResponse = {
  ok: boolean;
  message: string;
  totalResponses?: number;
  expiresIn?: number;
  accessToken?: string | null;
  refreshToken?: string | null;
};

export default function WootricSettingsPage() {
  const [apiUrl, setApiUrl] = useState("https://api.wootric.com");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>({ status: "idle", message: "" });
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WootricConfig | null>(null);
  const [testData, setTestData] = useState<TestResponse | null>(null);

  useEffect(() => {
    apiFetch<{ configured: boolean; config: WootricConfig | null }>("/api/wootric")
      .then((data) => {
        setConfig(data.config);
        if (data.config) {
          setApiUrl(data.config.apiUrl);
          setEmail(data.config.email);
          if (data.config.hasPassword) {
            setPassword("__saved__");
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleTest() {
    setTestResult({ status: "testing", message: "Authenticating with Wootric OAuth..." });
    setTestData(null);
    try {
      const res = await fetch("/api/wootric/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl,
          email,
          password: password === "__saved__" ? "" : password,
        }),
      });
      const data = (await res.json()) as TestResponse;
      setTestData(data);
      setTestResult({
        status: data.ok ? "ok" : "error",
        message: data.message,
      });
    } catch {
      setTestResult({ status: "error", message: "Request failed" });
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const wootric: Record<string, unknown> = {
        api_url: apiUrl,
        email,
      };
      if (password !== "__saved__") {
        wootric.password = password;
      }

      if (testData?.ok && testData.accessToken) {
        wootric.access_token = testData.accessToken;
        wootric.refresh_token = testData.refreshToken;
        wootric.expires_at = Math.floor(Date.now() / 1000) + (testData.expiresIn ?? 7200);
      }

      await apiFetch("/api/tenants/config", {
        method: "PATCH",
        body: JSON.stringify({ settings: { wootric } }),
      });
      setSaved(true);
      setConfig({
        apiUrl,
        email,
        hasPassword: true,
        tokenExpiresAt: (wootric.expires_at as number) ?? null,
      });
      setPassword("__saved__");
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200" />
        <div className="h-64 animate-pulse rounded-lg border bg-zinc-50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Integración Wootric</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configura las credenciales de la API de Wootric para acceder a respuestas de encuestas vía OAuth 2.0.
        </p>
      </div>

      {config && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Wootric ya está configurado{config.email ? ` como ${config.email}` : ""}.
          {config.tokenExpiresAt && (
            <span className="ml-1">
              Token expira {new Date(config.tokenExpiresAt * 1000).toLocaleString()}.
            </span>
          )}
        </div>
      )}

      <div className="space-y-5 rounded-lg border bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700">API URL</label>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.wootric.com"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-400">Base URL de la API de Wootric (e.g., https://api.wootric.com)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu-email@ejemplo.com"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Password</label>
          <input
            type="password"
            value={password === "__saved__" ? "" : password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={password === "__saved__" ? "••••••••" : "tu-contraseña"}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {password === "__saved__" && (
            <p className="mt-1 text-xs text-zinc-400">Password guardado — dejalo vacío para mantenerlo</p>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !apiUrl || !email}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          {saved && <span className="text-sm text-green-600">Saved successfully</span>}

          <div className="ml-auto">
            <ConnectionTest
              status={testResult.status}
              message={testResult.message}
              onTest={handleTest}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
