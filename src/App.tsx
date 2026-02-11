import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { IdentifyPage } from '@/pages/IdentifyPage';
import { LearnPage } from '@/pages/LearnPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { db } from '@/db/database';
import { loadKnowledgeBase } from '@/db/kb-loader';
import { hasApiKey } from '@/llm/api-key';
import { useAppStore } from '@/stores/app-store';

export function App() {
  const isInitialized = useAppStore((s) => s.isInitialized);
  const setInitialized = useAppStore((s) => s.setInitialized);
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    async function init() {
      await loadKnowledgeBase(db);

      // Check if an API key is stored so AI features are available immediately
      const keyExists = await hasApiKey(db);
      useAppStore.getState().setHasApiKey(keyExists);

      // Request persistent storage so browser won't evict our data
      if (navigator.storage?.persist) {
        await navigator.storage.persist();
      }

      setInitialized();
    }
    init();
  }, [setInitialized]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    // Re-check on tab focus — browser events can miss connectivity changes
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [setOnline]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-stone-500">Loading knowledge base...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/identify" element={<IdentifyPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
