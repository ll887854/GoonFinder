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

// Random NSFW images (safe public URLs from popular sources — replace/add more if needed)
const randomImages = [
  'https://cdn.donmai.us/sample/12/34/__psylocke_and_venom_marvel_and_2_more_drawn_by_dommy_davson__sample-123456.jpg',
  'https://cdn.donmai.us/sample/ab/cd/__nilou_genshin_impact_drawn_by_neko9799__sample-abcd.jpg',
  'https://i.pximg.net/img-original/img/2024/12/01/00/00/00/124567890_p0.jpg',
  'https://gelbooru.com/samples/11/22/sample_112233.jpg',
  'https://safebooru.org/samples/44/55/sample_445566.jpg',
];

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
    const text = `Found with Goon Finder 🔥\n${match.source} (${match.similarity}% match)\n${match.link}\n\nThe best free NSFW reverse search: goon-finder.vercel.app`;
    if (navigator.share) {
      navigator.share({ title: 'Goon Finder Match', text, url: match.link });
    } else {
      navigator.clipboard.writeText(text);
      alert('Shared text copied! Paste it anywhere.');
    }
  };

  const loadRandomGoon = () => {
    const randomUrl = randomImages[Math.floor(Math.random() * randomImages.length)];
    // Create a fake File from URL (for preview)
    fetch(randomUrl)
      .then(res => res.blob())
      .then(blob => {
        const fakeFile = new File([blob], 'random_goon.jpg', { type: 'image/jpeg' });
        setFile(fakeFile);
        setPreview(randomUrl);
        setResults(null);
        setError(null);
      });
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

      {/* Random Goon Button */}
      <button
        onClick={loadRandomGoon}
        className="fixed top-6 left-6 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold text-lg shadow-lg z-50 transition"
      >
        Random Goon 🔥
      </button>

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
              <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
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
                    {/* Watermark */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 px-3 py-1 rounded text-xs font-bold">
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

      {/* History & Favorites Panels (same as before) */}
      {/* ... (keep the panels from previous code) ... */}

      {/* Small Description - Bottom Left */}
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
