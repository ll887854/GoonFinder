'use client';

import { useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(80); // Default filter at 80%
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

  const extractFrames = async (file: File) => {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    await ffmpeg.exec(['-i', 'input.mp4', '-vf', 'fps=1/10', 'frame-%03d.png']);
    const data = await ffmpeg.readDir('.');
    const frameFiles = data.filter(f => f.startsWith('frame-'));
    const frames = await Promise.all(frameFiles.map(async f => await ffmpeg.readFile(f)));
    return frames.map((data, i) => new File([data as Uint8Array], `frame-${i}.png`, { type: 'image/png' }));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      let imagesToSearch = [file];
      if (file.type.startsWith('video/') || file.type === 'image/gif') {
        imagesToSearch = await extractFrames(file);
      }

      const formData = new FormData();
      imagesToSearch.forEach(img => formData.append('images', img));

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

  // Extract and normalize matches
  const getAllMatches = () => {
    if (!results) return [];

    const matches = [];

    // trace.moe
    if (results.traceMoe?.length > 0) {
      results.traceMoe.forEach((res: any) => {
        if (res.result) {
          res.result.forEach((match: any) => {
            matches.push({
              engine: 'trace.moe (Anime/Video)',
              similarity: (match.similarity * 100).toFixed(2),
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
              source: d.source || d.creator || 'Unknown',
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
              similarity: (match.score * 100).toFixed(2),
              thumbnail: match.thumbnail?.url,
              link: match.location,
              source: match.platform || 'Unknown',
            });
          });
        }
      });
    }

    // Ascii2D and IQDB (placeholder - expand parsing as needed)
    ['ascii2d', 'iqdb'].forEach(engine => {
      if (results[engine]?.length > 0) {
        results[engine].forEach((match: any) => {
          matches.push({
            engine: engine.toUpperCase(),
            similarity: match.similarity || 'N/A',
            thumbnail: match.thumbnail || null,
            link: match.link || '#',
            source: match.source || 'Unknown',
          });
        });
      }
    });

    // Sort all matches by similarity descending
    return matches.sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));
  };

  const allMatches = getAllMatches();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-10">Goon Finder</h1>

      <div className="w-full max-w-5xl bg-gray-800 p-8 rounded-xl shadow-2xl">
        <input
          type="file"
          accept="image/*,video/*,.gif"
          onChange={handleFileChange}
          className="w-full mb-6 p-3 bg-gray-700 rounded border border-gray-600"
        />

        {preview && (
          <div className="mb-8">
            <img src={preview} alt="Preview" className="w-full max-w-2xl mx-auto rounded-lg shadow-lg" />
            <p className="text-center text-gray-400 mt-3">Uploaded Media</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 rounded-lg text-lg"
        >
          {loading ? 'Searching all engines...' : 'Start Search'}
        </button>

        {error && <p className="mt-6 text-red-400 text-center">{error}</p>}

        {results && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Matches ≥ {threshold}%</h2>

            <div className="mb-8">
              <label className="block text-center text-gray-300 mb-2">Adjust Similarity Threshold</label>
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-center text-gray-400 mt-2">{threshold}%</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allMatches.filter(m => parseFloat(m.similarity) >= threshold).map((match, idx) => (
                <div key={idx} className="bg-gray-700 p-6 rounded-xl shadow-lg">
                  <p className="text-sm text-cyan-300 mb-2">{match.engine}</p>
                  {match.thumbnail && (
                    <img src={match.thumbnail} alt="Match" className="w-full h-auto rounded-lg mb-4" />
                  )}
                  <p className="text-lg font-bold mb-2">Similarity: {match.similarity}%</p>
                  <p className="text-sm text-gray-300 mb-3">Source: {match.source}</p>
                  <a
                    href={match.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-medium"
                  >
                    View Original →
                  </a>
                  {match.video && (
                    <a
                      href={match.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 text-sm text-green-400 hover:underline"
                    >
                      Watch Scene Clip
                    </a>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowRaw(!showRaw)}
              className="mt-12 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              {showRaw ? 'Hide' : 'View'} Raw JSON Data
            </button>

            {showRaw && (
              <pre className="mt-6 bg-black p-6 rounded-lg overflow-auto text-xs text-gray-300 border border-gray-700">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <footer className="mt-16 text-gray-500 text-sm">
        Goon Finder — Free NSFW Reverse Search • 2025
      </footer>
    </div>
  );
}
