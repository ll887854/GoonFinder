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

    // trace.moe
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

    // SauceNAO
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

    // Fluffle
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

    // IQDB (new)
    if (results.iqdb?.length > 0) {
      results.iqdb.forEach((res: any) => {
        if (res.results) {
          res.results.forEach((match: any) => {
            matches.push({
              engine: 'IQDB (Booru/R34/Furry)',
              similarity: match.similarity || 90, // IQDB doesn't always have % — default high
              thumbnail: match.thumbnail,
              link: match.link,
              source: match.source || 'Booru site',
            });
          });
        }
      });
    }

    // Ascii2D (new)
    if (results.ascii2d?.length > 0) {
      results.ascii2d.forEach((res: any) => {
        if (res.results) {
          res.results.forEach((match: any) => {
            matches.push({
              engine: 'Ascii2D (Anime/Illustration)',
              similarity: match.similarity || 85,
              thumbnail: match.thumbnail,
              link: match.link,
              source: match.source || 'Pixiv/Illustration',
            });
          });
        }
      });
    }

    // Yandex (new)
    if (results.yandex?.length > 0) {
      results.yandex.forEach((res: any) => {
        if (res.results) {
          res.results.forEach((match: any) => {
            matches.push({
              engine: 'Yandex (General/NSFW)',
              similarity: match.similarity || 80,
              thumbnail: match.thumbnail,
              link: match.link,
              source: match.source || 'Web',
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

      {/* ... rest of the return JSX same as before, with the banner div kept ... */}

      {/* Banner ad */}
      <div className="mt-16 flex justify-center">
        <ins className="eas6a97888e2" data-zoneid="5806290"></ins>
        <script
          dangerouslySetInnerHTML={{
            __html: `(AdProvider = window.AdProvider || []).push({"serve": {}});`,
          }}
        />
      </div>

      {/* ... rest same ... */}
    </div>
  );
}
