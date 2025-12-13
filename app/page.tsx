"use client"

import { useState } from "react"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!file) return

    setLoading(true)

    const formData = new FormData()
    formData.append("image", file)

    const res = await fetch("/api/search", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    setResults(data.results || [])
    setLoading(false)
  }

  return (
    <main style={{ textAlign: "center", padding: 20 }}>
      <h1>Goon Finder BETA_GPT</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <br /><br />

      <button onClick={handleSearch}>
        FIND!
      </button>

      {loading && <p>Searching...</p>}

      <div style={{ marginTop: 30 }}>
        {results.map((item, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              padding: 10,
              marginBottom: 15,
            }}
          >
            <img
              src={item.header.thumbnail}
              alt=""
              style={{ width: 150 }}
            />

            <p>
              <strong>Similarity:</strong> {item.header.similarity}%
            </p>

            {item.data?.title && (
              <p>
                <strong>Title:</strong> {item.data.title}
              </p>
            )}

            {item.data?.author_name && (
              <p>
                <strong>Author:</strong> {item.data.author_name}
              </p>
            )}

            {item.data?.ext_urls?.[0] && (
              <p>
                <strong>Source:</strong>{" "}
                <a
                  href={item.data.ext_urls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.data.ext_urls[0]}
                </a>
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
