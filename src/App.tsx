import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { IdentifyPage } from '@/pages/IdentifyPage';
import { LearnPage } from '@/pages/LearnPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { db } from '@/db/database';
import { loadKnowledgeBase } from '@/db/kb-loader';
import { useAppStore } from '@/stores/app-store';

export function App() {
  const isInitialized = useAppStore((s) => s.isInitialized);
  const setInitialized = useAppStore((s) => s.setInitialized);
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    async function init() {
      await loadKnowledgeBase(db);

      // Request persistent storage so browser won't evict our data
      if (navigator.storage?.persist) {
        await navigator.storage.persist();
      }

      setInitialized();
    }
    init();
  }, [setInitialized]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    setOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
