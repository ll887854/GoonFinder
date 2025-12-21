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

  const extractFrames = async (file: File): Promise<File[]> => {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    await ffmpeg.exec(['-i', 'input.mp4', '-vf', 'fps=1/10', 'frame-%03d.png']);

    // We KNOW the output naming scheme → no directory listing needed
    const frameNames = Array.from({ length: 20 }, (_, i) =>
      `frame-${String(i + 1).padStart(3, '0')}.png`
    );

    const frames: File[] = [];

    for (let i = 0; i < frameNames.length; i++) {
      try {
        const data = await ffmpeg.readFile(frameNames[i]);

        // 🔒 HARD TYPE SAFETY (no SharedArrayBuffer leaks)
        const bytes =
          data instanceof Uint8Array
            ? data
            : new Uint8Array(data as ArrayBuffer);

        const safeBuffer = new Uint8Array(bytes).buffer;

        frames.push(
          new File([safeBuffer], `frame-${i}.png`, {
            type: 'image/png',
          })
        );
      } catch {
        // Stop when frames run out
        break;
      }
    }

    return frames;
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      let images: File[] = [file];

      if (file.type.startsWith('video/') || file.type === 'image/gif') {
        images = await extractFrames(file);
      }

      const formData = new FormData();
      images.forEach(img => formData.append('images', img));

      const res = await axios.post('/api/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(res.data);
    } catch (e) {
      console.error(e);
      setError('Error processing search.');
    } finally {
      setLoading(false);
    }
  };

  const getAllMatches = () => {
    if (!results) return [];
    const matches: any[] = [];

    results.traceMoe?.forEach((r: any) =>
      r.result?.forEach((m: any) =>
        matches.push({
          engine: 'trace.moe',
          similarity: (m.similarity * 100).toFixed(2),
          thumbnail: m.image,
          link: `https://anilist.co/anime/${m.anilist}`,
          source: m.filename,
          video: m.video,
        })
      )
    );

    results.saucenao?.forEach((r: any) =>
      r.results?.forEach((m: any) =>
        matches.push({
          engine: 'SauceNAO',
          similarity: parseFloat(m.header.similarity),
          thumbnail: m.header.thumbnail,
          link: m.data.ext_urls?.[0] ?? '#',
          source: m.data.source ?? 'Unknown',
        })
      )
    );

    results.fluffle?.forEach((r: any) =>
      r.items?.forEach((m: any) =>
        matches.push({
          engine: 'Fluffle',
          similarity: (m.score * 100).toFixed(2),
          thumbnail: m.thumbnail?.url,
          link: m.location,
          source: m.platform,
        })
      )
    );

    return matches.sort(
      (a, b) => parseFloat(b.similarity) - parseFloat(a.similarity)
    );
  };

  const allMatches = getAllMatches();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Goon Finder</h1>

      <div className="max-w-5xl mx-auto bg-gray-800 p-8 rounded-xl">
        <input
          type="file"
          accept="image/*,video/*,.gif"
          onChange={handleFileChange}
          className="w-full mb-6"
        />

        {preview && (
          <img
            src={preview}
            className="mx-auto max-w-2xl rounded-lg mb-6"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full bg-blue-600 py-3 rounded-lg"
        >
          {loading ? 'Searching…' : 'Start Search'}
        </button>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        {results && (
          <>
            <div className="mt-8">
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={e => setThreshold(+e.target.value)}
                className="w-full"
              />
              <p className="text-center">{threshold}%</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              {allMatches
                .filter(m => parseFloat(m.similarity) >= threshold)
                .map((m, i) => (
                  <div key={i} className="bg-gray-700 p-4 rounded">
                    <p className="text-cyan-300 text-sm">{m.engine}</p>
                    {m.thumbnail && <img src={m.thumbnail} className="mt-2" />}
                    <p className="mt-2 font-bold">{m.similarity}%</p>
                    <a
                      href={m.link}
                      target="_blank"
                      className="text-blue-400 underline"
                    >
                      View source
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
              <pre className="mt-4 text-xs overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
