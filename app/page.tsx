'use client';

import { useState } from 'react';
import axios from 'axios';

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
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('images', file);

      const response = await axios.post('/api/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(response.data);
    } catch (err) {
      setError('Error processing search. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
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

    return matches.sort((a, b) => b.similarity - a.similarity);
  };

  const allMatches = getAllMatches();
  const filteredMatches = allMatches.filter(m => m.similarity >= threshold);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl font-bold mb-12">Goon Finder</h1>

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
          {loading ? 'Searching all engines...' : 'Start Search'}
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
                  <div key={idx} className="bg-gray-700 p-8 rounded-2xl shadow-2xl hover:shadow-cyan-500/50 transition">
                    <p className="text-cyan-400 font-bold text-xl mb-4">{match.engine}</p>
                    {match.thumbnail && (
                      <img src={match.thumbnail} alt="Match" className="w-full h-auto rounded-xl mb-6 shadow-lg" />
                    )}
                    <p className="text-3xl font-bold text-green-400 mb-3">{match.similarity}% Match</p>
                    <p className="text-gray-300 mb-6">Source: {match.source}</p>
                    <a
                      href={match.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-bold text-xl transition"
                    >
                      View Original →
                    </a>
                    {match.video && (
                      <a
                        href={match.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-4 text-green-400 hover:underline text-lg"
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

      <footer className="mt-20 text-gray-500 text-center text-lg">
        Goon Finder — Free NSFW Reverse Search • 2025
      </footer>
    </div>
  );
}
