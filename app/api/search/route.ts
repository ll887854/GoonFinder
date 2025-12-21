import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const images = formData.getAll('images') as File[];

  if (!images.length) {
    return NextResponse.json({ error: 'No images provided' }, { status: 400 });
  }

  try {
    const results: {
      fluffle: any[];
      traceMoe: any[];
      saucenao: any[];
      ascii2d: any[];
      iqdb: any[];
    } = {
      fluffle: [],
      traceMoe: [],
      saucenao: [],
      ascii2d: [],
      iqdb: [],
    };

    await Promise.all(
      images.map(async (image) => {
        const buffer = await image.arrayBuffer();

        /* ---------- Fluffle ---------- */
        const fluffleForm = new FormData();
        fluffleForm.append('file', new Blob([buffer]), image.name);

        const fluffleRes = await fetch('https://api.fluffle.xyz/v1/search', {
          method: 'POST',
          headers: { 'User-Agent': 'GoonFinder/1.0' },
          body: fluffleForm,
        });
        if (fluffleRes.ok) {
          results.fluffle.push(await fluffleRes.json());
        }

        /* ---------- trace.moe ---------- */
        const traceForm = new FormData();
        traceForm.append('file', new Blob([buffer]), image.name);

        const traceRes = await fetch('https://api.trace.moe/search', {
          method: 'POST',
          body: traceForm,
        });
        if (traceRes.ok) {
          results.traceMoe.push(await traceRes.json());
        }

        /* ---------- SauceNAO ---------- */
        const sauceKey = process.env.SAUCENAO_API_KEY;
        if (sauceKey) {
          const sauceForm = new FormData();
          sauceForm.append('file', new Blob([buffer]), image.name);
          sauceForm.append('api_key', sauceKey);
          sauceForm.append('output_type', '2');

          const sauceRes = await fetch('https://saucenao.com/search.php', {
            method: 'POST',
            body: sauceForm,
          });
          if (sauceRes.ok) {
            results.saucenao.push(await sauceRes.json());
          }
        }

        /* ---------- Ascii2D ---------- */
        const asciiForm = new FormData();
        asciiForm.append('file', new Blob([buffer]), image.name);

        const asciiRes = await fetch('https://ascii2d.net/search/file', {
          method: 'POST',
          body: asciiForm,
        });
        if (asciiRes.ok) {
          const html = await asciiRes.text();
          const matches =
            html.match(/<div class="detail-box">([\s\S]*?)<\/div>/g) || [];

          results.ascii2d.push(
            matches.map((m) => ({
              similarity: 80,
              link: m.match(/href="(.*?)"/)?.[1] ?? null,
            }))
          );
        }

        /* ---------- IQDB ---------- */
        const iqdbForm = new FormData();
        iqdbForm.append('file', new Blob([buffer]), image.name);

        const iqdbRes = await fetch('https://iqdb.org/', {
          method: 'POST',
          body: iqdbForm,
        });
        if (iqdbRes.ok) {
          const html = await iqdbRes.text();
          const matches =
            html.match(/<td class="image">([\s\S]*?)<\/td>/g) || [];

          results.iqdb.push(
            matches.map((m) => ({
              similarity: 90,
              link: m.match(/href="(.*?)"/)?.[1] ?? null,
            }))
          );
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
