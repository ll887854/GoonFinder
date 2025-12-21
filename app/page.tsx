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
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResults(null);
      setError(null);
      setShowRaw(false);
    }
  };

  // ✅ FIXED: uses listDir instead of readDir
  const extractFrames = async (file: File) => {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    await ffmpeg.exec(['-i', 'input.mp4', '-vf', 'fps=1/10', 'frame-%03d.png']);

    // ✅ CORRECT API
    const entries = await ffmpeg.listDir('/');

    const frameNames = entries
      .map((e) => e.name)
      .filter((name) => name.startsWith('frame-'));

    const frames = await Promise.all(
      frameNames.map(async (name, i) => {
        const data = await ffmpeg.readFile(name);
        return new File([data as Uint8Array], `frame-${i}.png`, {
          type: 'image/png',
        });
      })
    );

    return frames;
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
      imagesToSearch.forEach((img) => formData.append('images', img));

      const response = await axios.post('/api/search', formData);
      setResults(response.data);
    } catch (err) {
      console.error(err);
      setError('Error processing search. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAllMatches = () => {
    if (!results) return [];
    const matches: any[] = [];

    // trace.moe
    results.traceMoe?.forEach((res: any) => {
      res.result?.forEach((m: any) => {
        matches.push({
          engine: 'trace.moe',
          similarity: (m.similarity * 100).toFixed(2),
          thumbnail: m.image,
          link: `https://anilist.co/anime/${m.anilist}`,
          source: m.filename,
          video: m.video,
        });
      });
    });

    // SauceNAO
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

    // Fluffle
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
          <img src={preview} className="mx-auto max-h-96 mb-6 rounded" />
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full bg-blue-600 py-3 rounded"
        >
          {loading ? 'Searching…' : 'Start Search'}
        </button>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        <div className="grid mt-8 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allMatches
            .filter((m) => parseFloat(m.similarity) >= threshold)
            .map((m, i) => (
              <div key={i} className="bg-gray-700 p-4 rounded">
                <p className="text-sm text-cyan-300">{m.engine}</p>
                {m.thumbnail && (
                  <img src={m.thumbnail} className="rounded my-2" />
                )}
                <p>Similarity: {m.similarity}%</p>
                <a href={m.link} target="_blank" className="text-blue-400">
                  View Source →
                </a>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
