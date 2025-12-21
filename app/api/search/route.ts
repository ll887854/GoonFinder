<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const images = formData.getAll('images') as File[];

  if (!images.length) {
    return NextResponse.json({ error: 'No images provided' }, { status: 400 });
  }

  try {
    const results: any = {
      fluffle: [],
      traceMoe: [],
      saucenao: [],
      ascii2d: [],
      iqdb: [],
    };

    await Promise.all(images.map(async (image) => {
      const buffer = await image.arrayBuffer();
      const imgForm = new FormData();
      imgForm.append('file', new Blob([buffer]), image.name);

      // Fluffle
      const fluffleRes = await fetch('https://api.fluffle.xyz/v1/search', {
        method: 'POST',
        headers: { 'User-Agent': 'GoonFinder/1.0' },
        body: imgForm,
      });
      if (fluffleRes.ok) results.fluffle.push(await fluffleRes.json());

      // trace.moe
      const traceRes = await fetch('https://api.trace.moe/search', {
        method: 'POST',
        body: imgForm,
      });
      if (traceRes.ok) results.traceMoe.push(await traceRes.json());

      // SauceNAO
      const sauceKey = process.env.SAUCENAO_API_KEY;
      if (sauceKey) {
        const sauceForm = new FormData();
        sauceForm.append('file', new Blob([buffer]), image.name);
        sauceForm.append('api_key', sauceKey);
        sauceForm.append('output_type', '2'); // JSON output
        const sauceRes = await fetch('https://saucenao.com/search.php', {
          method: 'POST',
          body: sauceForm,
        });
        if (sauceRes.ok) results.saucenao.push(await sauceRes.json());
      }

      // Ascii2D (bovw search for feature)
      const asciiForm = new FormData();
      asciiForm.append('file', new Blob([buffer]), image.name);
      const asciiRes = await fetch('https://ascii2d.net/search/file', {
        method: 'POST',
        body: asciiForm,
      });
      if (asciiRes.ok) {
        const html = await asciiRes.text();
        // Parse HTML for results (simple extraction - expand if needed)
        const matches = html.match(/<div class="detail-box">(.*?)<\/div>/gs) || [];
        results.ascii2d.push(matches.map(m => ({ similarity: 80, link: m.match(/href="(.*?)"/)?.[1] }))); // Placeholder % - parse better in production
      }

      // IQDB
      const iqdbForm = new FormData();
      iqdbForm.append('file', new Blob([buffer]), image.name);
      const iqdbRes = await fetch('https://iqdb.org/', {
        method: 'POST',
        body: iqdbForm,
      });
      if (iqdbRes.ok) {
        const html = await iqdbRes.text();
        // Parse HTML for results
        const matches = html.match(/<td class="image">(.*?)<\/td>/gs) || [];
        results.iqdb.push(matches.map(m => ({ similarity: 90, link: m.match(/href="(.*?)"/)?.[1] }))); // Placeholder % - parse better
      }
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
=======
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const images = formData.getAll('images') as File[];

  if (!images.length) {
    return NextResponse.json({ error: 'No images provided' }, { status: 400 });
  }

  try {
    const results: any = {
      fluffle: [],
      traceMoe: [],
      saucenao: [],
      ascii2d: [],
      iqdb: [],
    };

    await Promise.all(images.map(async (image) => {
      const buffer = await image.arrayBuffer();
      const imgForm = new FormData();
      imgForm.append('file', new Blob([buffer]), image.name);

      // Fluffle
      const fluffleRes = await fetch('https://api.fluffle.xyz/v1/search', {
        method: 'POST',
        headers: { 'User-Agent': 'GoonFinder/1.0' },
        body: imgForm,
      });
      if (fluffleRes.ok) results.fluffle.push(await fluffleRes.json());

      // trace.moe
      const traceRes = await fetch('https://api.trace.moe/search', {
        method: 'POST',
        body: imgForm,
      });
      if (traceRes.ok) results.traceMoe.push(await traceRes.json());

      // SauceNAO
      const sauceKey = process.env.SAUCENAO_API_KEY;
      if (sauceKey) {
        const sauceForm = new FormData();
        sauceForm.append('file', new Blob([buffer]), image.name);
        sauceForm.append('api_key', sauceKey);
        sauceForm.append('output_type', '2'); // JSON output
        const sauceRes = await fetch('https://saucenao.com/search.php', {
          method: 'POST',
          body: sauceForm,
        });
        if (sauceRes.ok) results.saucenao.push(await sauceRes.json());
      }

      // Ascii2D (bovw search for feature)
      const asciiForm = new FormData();
      asciiForm.append('file', new Blob([buffer]), image.name);
      const asciiRes = await fetch('https://ascii2d.net/search/file', {
        method: 'POST',
        body: asciiForm,
      });
      if (asciiRes.ok) {
        const html = await asciiRes.text();
        // Parse HTML for results (simple extraction - expand if needed)
        const matches = html.match(/<div class="detail-box">(.*?)<\/div>/gs) || [];
        results.ascii2d.push(matches.map(m => ({ similarity: 80, link: m.match(/href="(.*?)"/)?.[1] }))); // Placeholder % - parse better in production
      }

      // IQDB
      const iqdbForm = new FormData();
      iqdbForm.append('file', new Blob([buffer]), image.name);
      const iqdbRes = await fetch('https://iqdb.org/', {
        method: 'POST',
        body: iqdbForm,
      });
      if (iqdbRes.ok) {
        const html = await iqdbRes.text();
        // Parse HTML for results
        const matches = html.match(/<td class="image">(.*?)<\/td>/gs) || [];
        results.iqdb.push(matches.map(m => ({ similarity: 90, link: m.match(/href="(.*?)"/)?.[1] }))); // Placeholder % - parse better
      }
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
>>>>>>> b8da9f399094fd565339e37a549033b5fe4d1b52
