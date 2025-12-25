'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface SearchHistory {
  id: string;
  date: string;
  preview: string;
  results: any;
}

interface Favorite {
  id: string;
  match: any;
  date: string;
}

interface Match {
  engine: string;
  similarity: number;
  thumbnail?: string;
  link: string;
  source: string;
  video?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(80);
  const [showRaw, setShowRaw] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('goonFinderHistory');
    const savedFavorites = localStorage.getItem('goonFinderFavorites');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
  }, []);

  const saveToHistory = (currentPreview: string, currentResults: any) => {
    const newEntry: SearchHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      preview: currentPreview,
      results: currentResults,
    };
    const updated = [newEntry, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('goonFinderHistory', JSON.stringify(updated));
  };

  const toggleFavorite = (match: any) => {
    const existing = favorites.find(f => f.match.link === match.link && f.match.engine === match.engine);
    if (existing) {
      const updated = favorites.filter(f => f.id !== existing.id);
      setFavorites(updated);
      localStorage.setItem('goonFinderFavorites', JSON.stringify(updated));
    } else {
      const newFav: Favorite = { id: Date.now().toString(), match, date: new Date().toLocaleString() };
      const updated = [newFav, ...favorites];
      setFavorites(updated);
      localStorage.setItem('goonFinderFavorites', JSON.stringify(updated));
    }
  };

  const isFavorite = (match: any) => {
    return favorites.some(f => f.match.link === match.link && f.match.engine === match.engine);
  };

  const shareMatch = (match: Match) => {
    const text = `Found with Goon Finder 🔥\n${match.source} (${match.similarity}% match)\n${match.link}\nTry it: https://goon-finder.vercel.app`;
    if (navigator.share) {
      navigator.share({ title: 'Goon Finder Match', text, url: match.link });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResults(null);
      setError(null);
      setShowRaw(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('images', file);

      const response = await axios.post('/api/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(response.data);
      saveToHistory(preview, response.data);
    } catch (err) {
      setError('Error processing search. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (entry: SearchHistory) => {
    setPreview(entry.preview);
    setResults(entry.results);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('goonFinderHistory');
  };

  const clearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem('goonFinderFavorites');
  };

  const getAllMatches = (): Match[] => {
    if (!results) return [];

    const matches: Match[] = [];

    if (results.traceMoe?.length > 0) {
      results.traceMoe.forEach((res: any) => {
        if (res.result) {
          res.result.forEach((match: any) => {
            matches.push({
              engine: 'trace.moe (Anime/Video)',
              similarity: parseFloat((match.similarity * 100).toFixed(2)),
              thumbnail: match.image,
              link: `https://anilist.co/anime/${match.anilist}`,
              source: match.filename || 'Anime scene',
              video: match.video,
            });
          });
        }
      });
    }

    if (results.saucenao?.length > 0) {
      results.saucenao.forEach((res: any) => {
        if (res.results) {
          res.results.forEach((match: any) => {
            const h = match.header;
            const d = match.data;
            matches.push({
              engine: 'SauceNAO (R34/Art)',
              similarity: parseFloat(h.similarity),
              thumbnail: h.thumbnail,
              link: d.ext_urls?.[0] || d.source || '#',
              source: d.source || d.creator?.join(', ') || 'Unknown',
            });
          });
        }
      });
    }

    if (results.fluffle?.length > 0) {
      results.fluffle.forEach((res: any) => {
        if (res.items) {
          res.items.forEach((match: any) => {
            matches.push({
              engine: 'Fluffle (Furry/NSFW Art)',
              similarity: parseFloat((match.score * 100).toFixed(2)),
              thumbnail: match.thumbnail?.url,
              link: match.location,
              source: match.platform || 'Unknown',
            });
          });
        }
      });
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  };

  const allMatches = getAllMatches();
  const filteredMatches = allMatches.filter(m => m.similarity >= threshold);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 relative">
      <h1 className="text-5xl font-bold mb-12">Goon Finder</h1>

      {/* Top Right Buttons */}
      <div className="fixed top-6 right-6 flex gap-4 z-50">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold text-lg shadow-lg transition"
        >
          History ({history.length})
        </button>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="bg-pink-600 hover:bg-pink-700 px-6 py-3 rounded-lg font-bold text-lg shadow-lg transition"
        >
          Favorites ({favorites.length})
        </button>
      </div>

      <div className="w-full max-w-5xl bg-gray-800 p-10 rounded-2xl shadow-2xl">
        <input
          type="file"
          accept="image/*,video/*,.gif"
          onChange={handleFileChange}
          className="w-full mb-8 p-4 bg-gray-700 rounded-lg border border-gray-600 text-lg"
        />

        {preview && (
          <div className="mb-10 text-center">
            <img src={preview} alt="Preview" className="mx-auto max-w-2xl rounded-xl shadow-2xl" />
            <p className="mt-4 text-gray-400 text-lg">Uploaded Media</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-5 rounded-xl text-2xl font-bold transition"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 mr-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Searching all engines...
            </span>
          ) : 'Start Search'}
        </button>

        {error && <p className="mt-8 text-red-400 text-center text-xl">{error}</p>}

        {results && (
          <div className="mt-16">
            <div className="mb-12 text-center">
              <label className="block text-3xl mb-4 text-gray-200">
                Similarity Threshold: {threshold}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-4 bg-gray-700 rounded-lg cursor-pointer accent-blue-500"
              />
            </div>

            {filteredMatches.length === 0 ? (
              <p className="text-center text-gray-400 text-2xl mt-10">
                No matches above {threshold}% — try lowering the slider!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredMatches.map((match, idx) => (
                  <div key={idx} className="bg-gray-700 p-8 rounded-2xl shadow-2xl hover:shadow-cyan-500/50 transition relative">
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 px-3 py-1 rounded text-xs font-bold">
                      Found with Goon Finder
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <p className="text-cyan-400 font-bold text-xl">{match.engine}</p>
                      <button onClick={() => toggleFavorite(match)} className="text-3xl">
                        {isFavorite(match) ? '❤️' : '🤍'}
                      </button>
                    </div>
                    {match.thumbnail && (
                      <img src={match.thumbnail} alt="Match" className="w-full h-auto rounded-xl mb-6 shadow-lg" />
                    )}
                    <p className="text-3xl font-bold text-green-400 mb-3">{match.similarity}% Match</p>
                    <p className="text-gray-300 mb-6">Source: {match.source}</p>
                    <div className="flex gap-3">
                      <a
                        href={match.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold text-center transition"
                      >
                        View Original
                      </a>
                      <button
                        onClick={() => shareMatch(match)}
                        className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold transition"
                      >
                        Share
                      </button>
                    </div>
                    {match.video && (
                      <a
                        href={match.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-4 text-green-400 hover:underline text-center"
                      >
                        Watch Scene Clip
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ExoClick Banner Ad */}
            <div className="mt-16 flex justify-center">
              <ins className="eas6a97888e2" data-zoneid="5806290"></ins>
              <script
                dangerouslySetInnerHTML={{
                  __html: `(AdProvider = window.AdProvider || []).push({"serve": {}});`,
                }}
              />
            </div>

            <div className="mt-16 text-center">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="bg-purple-600 hover:bg-purple-700 px-10 py-5 rounded-xl font-bold text-2xl transition"
              >
                {showRaw ? 'Hide' : 'Show'} Raw JSON
              </button>
            </div>

            {showRaw && (
              <pre className="mt-8 bg-black p-8 rounded-xl overflow-auto text-sm border border-gray-700">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-end" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-md bg-gray-800 h-full shadow-2xl p-8 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Search History</h2>
              <button onClick={() => setShowHistory(false)} className="text-4xl hover:text-red-400">×</button>
            </div>
            <p className="text-gray-300 mb-6">
              Your recent searches (auto-saved in browser).
            </p>
            {history.length === 0 ? (
              <p className="text-center text-gray-400 mt-20 text-xl">No history yet — start searching!</p>
            ) : (
              <>
                <button onClick={clearHistory} className="mb-6 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold w-full">
                  Clear History
                </button>
                <div className="space-y-6">
                  {history.map(entry => (
                    <div key={entry.id} className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">{entry.date}</p>
                      <img src={entry.preview} alt="Past" className="w-full rounded mb-3" />
                      <button
                        onClick={() => loadFromHistory(entry)}
                        className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                      >
                        Re-run Search
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Favorites Panel */}
      {showFavorites && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-end" onClick={() => setShowFavorites(false)}>
          <div className="w-full max-w-md bg-gray-800 h-full shadow-2xl p-8 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Favorites</h2>
              <button onClick={() => setShowFavorites(false)} className="text-4xl hover:text-red-400">×</button>
            </div>
            <p className="text-gray-300 mb-6">
              Your favorite matches (saved locally).
            </p>
            {favorites.length === 0 ? (
              <p className="text-center text-gray-400 mt-20 text-xl">No favorites yet — click ❤️ on a match!</p>
            ) : (
              <>
                <button onClick={clearFavorites} className="mb-6 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold w-full">
                  Clear Favorites
                </button>
                <div className="space-y-6">
                  {favorites.map(fav => (
                    <div key={fav.id} className="bg-gray-700 p-6 rounded-xl">
                      <p className="text-cyan-400 font-bold mb-2">{fav.match.engine}</p>
                      {fav.match.thumbnail && (
                        <img src={fav.match.thumbnail} alt="Fav" className="w-full rounded mb-4" />
                      )}
                      <p className="font-bold text-green-400 mb-2">{fav.match.similarity}%</p>
                      <p className="text-gray-300 mb-4">Source: {fav.match.source}</p>
                      <div className="flex gap-3">
                        <a
                          href={fav.match.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded text-center font-bold"
                        >
                          View
                        </a>
                        <button
                          onClick={() => toggleFavorite(fav.match)}
                          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Small Description */}
      <div className="fixed bottom-4 left-4 max-w-sm bg-gray-800 bg-opacity-90 p-4 rounded-lg shadow-lg text-sm">
        <p className="text-gray-300 leading-relaxed">
          Goon Finder — Free NSFW reverse image search for R34, hentai, anime scenes, furry art & more. 
          Powered by SauceNAO, trace.moe, Fluffle. Built 2025.
        </p>
      </div>

      <footer className="mt-20 text-gray-500 text-center text-lg">
        Goon Finder — Free NSFW Reverse Search • 2025
      </footer>
    </div>
  );
}
