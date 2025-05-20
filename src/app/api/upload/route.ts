import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const filePath = formData.get('filePath')?.toString();

    if (!file || !filePath) {
      console.error('Upload rejected:', { file, filePath });
      return NextResponse.json({ error: 'Missing file or filePath' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const apiKey = process.env.LIGHTHOUSE_API_KEY!;

    const fd = new FormData();
    fd.append('file', new Blob([buffer]), filePath); // ← use custom name here

    const res = await fetch('https://node.lighthouse.storage/api/v0/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    const rawText = await res.text();
    if (!res.ok) {
      console.error('Upload failed:', rawText);
      return NextResponse.json({ error: 'Upload failed', details: rawText }, { status: res.status });
    }

    const data = JSON.parse(rawText);
    const ipfsUrl = `https://ipfs.io/ipfs/${data.Hash}`;
    return NextResponse.json({ ipfsUrl });
  } catch (err) {
    console.error('Upload failed:', err);
    return NextResponse.json({ error: 'Upload failed', details: String(err) }, { status: 500 });
  }
}
