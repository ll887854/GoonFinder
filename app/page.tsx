'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(80);
  const [showRaw, setShowRaw] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults(null);
    setError(null);
    setShowRaw(false);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('images', file);

      const res = await axios.post('/api/search', formData);
      setResults(res.data);
    } catch (err) {
      console.error(err);
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAllMatches = () => {
    if (!results) return [];
    const matches: any[] = [];

    results.traceMoe?.forEach((res: any) => {
      res.result?.forEach((m: any) => {
        matches.push({
          engine: 'trace.moe',
          similarity: (m.similarity * 100).toFixed(2),
          thumbnail: m.image,
          link: `https://anilist.co/anime/${m.anilist}`,
          source: m.filename,
        });
      });
    });

    results.saucenao?.forEach((res: any) => {
      res.results?.forEach((m: any) => {
        matches.push({
          engine: 'SauceNAO',
          similarity: parseFloat(m.header.similarity),
          thumbnail: m.header.thumbnail,
          link: m.data.ext_urls?.[0] || '#',
          source: m.data.source || 'Unknown',
        });
      });
    });

    results.fluffle?.forEach((res: any) => {
      res.items?.forEach((m: any) => {
        matches.push({
          engine: 'Fluffle',
          similarity: (m.score * 100).toFixed(2),
          thumbnail: m.thumbnail?.url,
          link: m.location,
          source: m.platform,
        });
      });
    });

    return matches.sort(
      (a, b) => parseFloat(b.similarity) - parseFloat(a.similarity)
    );
  };

  const matches = getAllMatches();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Goon Finder</h1>

      <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl">
        <input
          type="file"
          accept="image/*,video/*,.gif"
          onChange={handleFileChange}
          className="w-full mb-6"
        />

        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="mx-auto max-h-96 mb-6 rounded"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full bg-blue-600 py-3 rounded"
        >
          {loading ? 'Searching…' : 'Start Search'}
        </button>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        {matches.length > 0 && (
          <>
            <h2 className="text-2xl mt-10 mb-4 text-center">
              Matches ≥ {threshold}%
            </h2>

            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full mb-6"
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matches
                .filter((m) => parseFloat(m.similarity) >= threshold)
                .map((m, i) => (
                  <div key={i} className="bg-gray-700 p-4 rounded">
                    <p className="text-cyan-300 text-sm">{m.engine}</p>
                    {m.thumbnail && (
                      <img src={m.thumbnail} className="rounded my-2" />
                    )}
                    <p>Similarity: {m.similarity}%</p>
                    <p className="text-sm text-gray-300">{m.source}</p>
                    <a
                      href={m.link}
                      target="_blank"
                      className="text-blue-400"
                    >
                      View →
                    </a>
                  </div>
                ))}
            </div>

            <button
              onClick={() => setShowRaw(!showRaw)}
              className="mt-10 bg-purple-600 px-6 py-3 rounded"
            >
              {showRaw ? 'Hide' : 'Show'} Raw JSON
            </button>

            {showRaw && (
              <pre className="mt-4 bg-black p-4 rounded text-xs overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
