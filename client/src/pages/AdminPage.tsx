import { useEffect, useState } from 'react';
import { adminRequest } from '../api';
import type { Quote } from '../types';

const DEFAULT_URL =
  'https://medium.com/@ericjorgenson/navalism-quotes-perceptions-from-naval-ravikant-8f6f0e9df9d4';

const AdminPage = () => {
  const [tokenInput, setTokenInput] = useState(localStorage.getItem('admin-token') ?? '');
  const [token, setToken] = useState(localStorage.getItem('admin-token') ?? '');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [message, setMessage] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [importUrl, setImportUrl] = useState(DEFAULT_URL);
  const [lines, setLines] = useState('');

  const loadQuotes = async (auth: string) => {
    const data = await adminRequest<Quote[]>('/api/admin/quotes', auth);
    setQuotes(data);
  };

  useEffect(() => {
    if (token) {
      loadQuotes(token).catch((err) => setMessage((err as Error).message));
    }
  }, [token]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setMessage('Working...');
      await fn();
      setMessage('Done.');
      if (token) await loadQuotes(token);
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl">Admin</h1>
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className="w-full rounded border border-zinc-700 bg-black p-3"
        />
        <button
          onClick={() => {
            localStorage.setItem('admin-token', tokenInput);
            setToken(tokenInput);
          }}
          className="rounded border border-zinc-700 px-4 py-2"
        >
          Save Token
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Admin Tools</h1>
      <p className="text-sm text-zinc-400">{message}</p>

      <section className="space-y-3 rounded border border-zinc-800 p-4">
        <h2 className="text-lg">Add Quote</h2>
        <textarea value={newQuote} onChange={(e) => setNewQuote(e.target.value)} className="h-24 w-full rounded border border-zinc-700 bg-black p-3" />
        <button className="rounded border border-zinc-700 px-4 py-2" onClick={() => run(() => adminRequest('/api/admin/quote', token, { method: 'POST', body: JSON.stringify({ text: newQuote }) }))}>
          Add
        </button>
      </section>

      <section className="space-y-3 rounded border border-zinc-800 p-4">
        <h2 className="text-lg">Import from URL</h2>
        <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-3" />
        <button className="rounded border border-zinc-700 px-4 py-2" onClick={() => run(() => adminRequest('/api/admin/import-url', token, { method: 'POST', body: JSON.stringify({ url: importUrl }) }))}>
          Import URL
        </button>
      </section>

      <section className="space-y-3 rounded border border-zinc-800 p-4">
        <h2 className="text-lg">Bulk Import Lines</h2>
        <textarea value={lines} onChange={(e) => setLines(e.target.value)} placeholder="One quote per line" className="h-36 w-full rounded border border-zinc-700 bg-black p-3" />
        <button className="rounded border border-zinc-700 px-4 py-2" onClick={() => run(() => adminRequest('/api/admin/import-lines', token, { method: 'POST', body: JSON.stringify({ lines }) }))}>
          Import Lines
        </button>
      </section>

      <section className="space-y-3 rounded border border-zinc-800 p-4">
        <h2 className="text-lg">Delete Quote</h2>
        <div className="space-y-3">
          {quotes.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-2">
              <p className="text-sm text-zinc-300">{q.text}</p>
              <button className="rounded border border-red-700 px-3 py-1 text-xs" onClick={() => run(() => adminRequest(`/api/admin/quote/${q.id}`, token, { method: 'DELETE' }))}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
