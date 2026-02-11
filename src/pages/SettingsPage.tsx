import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/db/database';
import { exportUserData, importUserData, createExportBlob } from '@/db/backup';
import { useAppStore } from '@/stores/app-store';
import { saveApiKey, getApiKey, clearApiKey, getSettings, saveSettings } from '@/llm/api-key';
import { getMonthlySpend } from '@/llm/cost-tracker';
import { callLLM } from '@/llm/api-client';

export function SettingsPage() {
  const lastBackupDate = useAppStore((s) => s.lastBackupDate);
  const sessionsSinceBackup = useAppStore((s) => s.sessionsSinceBackup);
  const recordBackup = useAppStore((s) => s.recordBackup);
  const setHasApiKey = useAppStore((s) => s.setHasApiKey);
  const [status, setStatus] = useState<string | null>(null);

  // LLM settings state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyStored, setKeyStored] = useState(false);
  const [budgetInput, setBudgetInput] = useState('5.00');
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [llmStatus, setLlmStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadLlmSettings() {
      const key = await getApiKey(db);
      setKeyStored(!!key);
      setHasApiKey(!!key);
      if (key) setApiKeyInput(key);

      const settings = await getSettings(db);
      setBudgetInput(settings.budget_limit_usd.toFixed(2));

      const spend = await getMonthlySpend(db);
      setMonthlySpend(spend);
    }
    loadLlmSettings();
  }, [setHasApiKey]);

  async function handleExport() {
    try {
      const json = await exportUserData(db);
      const blob = createExportBlob(json);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mushroom-id-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      recordBackup();
      setStatus('Backup exported successfully.');
    } catch {
      setStatus('Export failed. Please try again.');
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importUserData(db, text);
        setStatus('Data restored successfully.');
      } catch {
        setStatus('Import failed. Is this a valid backup file?');
      }
    };
    input.click();
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) return;
    await saveApiKey(db, apiKeyInput.trim());
    setKeyStored(true);
    setHasApiKey(true);
    setLlmStatus('API key saved.');
  }

  async function handleClearKey() {
    await clearApiKey(db);
    setApiKeyInput('');
    setKeyStored(false);
    setHasApiKey(false);
    setLlmStatus('API key removed.');
  }

  async function handleSaveBudget() {
    const budget = parseFloat(budgetInput);
    if (isNaN(budget) || budget <= 0) return;
    await saveSettings(db, { budget_limit_usd: budget });
    setLlmStatus('Budget updated.');
  }

  async function handleTestConnection() {
    const key = await getApiKey(db);
    if (!key) {
      setLlmStatus('Save an API key first.');
      return;
    }
    setTesting(true);
    setLlmStatus(null);
    try {
      const settings = await getSettings(db);
      await callLLM(
        {
          model: settings.model,
          messages: [
            { role: 'user', content: 'Reply with exactly: {"status":"ok"}' },
          ],
          max_tokens: 20,
          temperature: 0,
          thinking: { type: 'disabled' },
        },
        key,
        settings.endpoint,
      );
      setLlmStatus('Connection successful!');
    } catch (err) {
      setLlmStatus(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Settings</h1>

      {/* AI Assistant Section */}
      <section className="rounded-lg bg-white border border-stone-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">AI Assistant</h2>
        <p className="text-sm text-stone-600">
          Connect to z.ai for photo analysis, feature extraction, and natural language explanations.
          The AI never makes safety decisions — all safety logic is deterministic.
        </p>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">API Key</span>
          <div className="mt-1 flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your z.ai API key"
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Get your API key from{' '}
            <a href="https://z.ai/manage-apikey/apikey-list" target="_blank" rel="noopener noreferrer" className="text-green-700 underline">
              z.ai API Keys
            </a>.
          </p>
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSaveKey}
            disabled={!apiKeyInput.trim()}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white active:bg-green-800 disabled:opacity-50"
          >
            Save Key
          </button>
          {keyStored && (
            <button
              onClick={handleClearKey}
              className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 active:bg-red-200"
            >
              Remove Key
            </button>
          )}
          <button
            onClick={handleTestConnection}
            disabled={testing || !keyStored}
            className="rounded-lg bg-stone-200 px-4 py-2 text-sm text-stone-700 active:bg-stone-300 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Monthly Budget (USD)</span>
          <div className="mt-1 flex gap-2 items-center">
            <span className="text-sm text-stone-500">$</span>
            <input
              type="number"
              step="0.50"
              min="0.50"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleSaveBudget}
              className="rounded-lg bg-stone-200 px-3 py-2 text-xs text-stone-700"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Spent this month: ${monthlySpend.toFixed(4)}
          </p>
        </label>

        {llmStatus && (
          <p className={`text-sm ${llmStatus.includes('failed') || llmStatus.includes('error') ? 'text-red-700' : 'text-green-700'}`}>
            {llmStatus}
          </p>
        )}
      </section>

      {/* Backup & Restore Section */}
      <section className="rounded-lg bg-white border border-stone-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">
          Backup &amp; Restore
        </h2>
        <p className="text-sm text-stone-600">
          Export your competency data, session history, and personal notes.
          Core knowledge base data ships with the app and doesn't need backup.
        </p>

        {lastBackupDate && (
          <p className="text-sm text-stone-500">
            Last backup: {new Date(lastBackupDate).toLocaleDateString()}
          </p>
        )}
        {sessionsSinceBackup > 0 && (
          <p className="text-sm text-amber-600">
            {sessionsSinceBackup} session{sessionsSinceBackup !== 1 ? 's' : ''}{' '}
            since last backup
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white active:bg-green-800"
          >
            Export Data
          </button>
          <button
            onClick={handleImport}
            className="rounded-lg bg-stone-200 px-4 py-2 text-sm text-stone-700 active:bg-stone-300"
          >
            Import Data
          </button>
        </div>

        {status && (
          <p className="text-sm text-green-700">{status}</p>
        )}
      </section>

      <Link
        to="/"
        className="inline-block text-green-700 text-sm hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
