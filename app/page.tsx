'use client';

import { useState, useRef } from 'react';
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

  const ffmpegRef = useRef<FFmpeg | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResults(null);
    setError(null);
    setShowRaw(false);
  };

  const getFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const extractFrames = async (file: File): Promise<File[]> => {
    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-vf',
      'fps=1/10',
      'frame-%03d.png',
    ]);

    const entries = await ffmpeg.listDir('/');

    const frameNames = entries
      .map((e) => e.name)
      .filter((name) => name.startsWith('frame-'));

    const frames = await Promise.all(
      frameNames.map(async (name, i) => {
        const data = await ffmpeg.readFile(name);

        // ✅ FIX: normalize to real ArrayBuffer
        const buffer =
          data instanceof Uint8Array ? data.buffer.slice(0) : data;

        return new File([buffer], `frame-${i}.png`, {
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
      let imagesToSearch: File[] = [file];

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

    results.traceMoe?.forEach((res: any) =>
      res.result?.forEach((m: any) =>
        matches.push({
          engine: 'trace.moe',
          similarity: (m.similarity * 100).toFixed(2),
          thumbnail: m.image,
          link: `https://anilist.co/anime/${m.anilist}`,
          source: m.filename || 'Anime scene',
          video: m.video,
        })
      )
    );

    results.saucenao?.forEach((res: any) =>
      res.results?.forEach((m: any) =>
        matches.push({
          engine: 'SauceNAO',
          similarity: parseFloat(m.header.similarity),
          thumbnail: m.header.thumbnail,
          link: m.data.ext_urls?.[0] || '#',
          source: m.data.source || m.data.creator || 'Unknown',
        })
      )
    );

    results.fluffle?.forEach((res: any) =>
      res.items?.forEach((m: any) =>
        matches.push({
          engine: 'Fluffle',
          similarity: (m.score * 100).toFixed(2),
          thumbnail: m.thumbnail?.url,
          link: m.location,
          source: m.platform || 'Unknown',
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
      <h1 className="text-4xl font-bold text-center mb-10">Goon Finder</h1>

      <div className="max-w-5xl mx-auto bg-gray-800 p-8 rounded-xl">
        <input
          type="file"
          accept="image/*,video/*,.gif"
          onChange={handleFileChange}
          className="w-full mb-6 p-3 bg-gray-700 rounded"
        />

        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="mx-auto max-w-2xl rounded mb-6"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full bg-blue-600 py-4 rounded font-bold"
        >
          {loading ? 'Searching…' : 'Start Search'}
        </button>

        {error && <p className="mt-4 text-red-400 text-center">{error}</p>}

        {results && (
          <>
            <div className="mt-10">
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(+e.target.value)}
                className="w-full"
              />
              <p className="text-center mt-2">{threshold}% threshold</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {allMatches
                .filter((m) => parseFloat(m.similarity) >= threshold)
                .map((m, i) => (
                  <div key={i} className="bg-gray-700 p-4 rounded">
                    <p className="text-cyan-300">{m.engine}</p>
                    {m.thumbnail && (
                      <img src={m.thumbnail} className="rounded my-3" />
                    )}
                    <p>Similarity: {m.similarity}%</p>
                    <a
                      href={m.link}
                      target="_blank"
                      className="text-blue-400 underline"
                    >
                      View Source
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
              <pre className="mt-4 bg-black p-4 text-xs overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
