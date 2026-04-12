import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;  // 8 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

function isBlobAvailable() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function getExtension(filename: string, mimeType: string): string {
  const fromMime: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  };
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || fromMime[mimeType] || 'bin';
}

// ── POST: upload a file ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file     = formData.get('file')         as File   | null;
    const diagKey  = formData.get('diagnosisKey') as string | null;
    const slot     = formData.get('slot')         as string | null; // photo_0..photo_3 | video
    const password = formData.get('password')     as string | null;
    const oldUrl   = formData.get('oldUrl')       as string | null;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!file || !diagKey || !slot) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const isVideo = slot === 'video';
    const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type}` }, { status: 400 });
    }
    if (file.size > maxSize) {
      const mb = Math.round(maxSize / 1024 / 1024);
      return NextResponse.json({ error: `Archivo demasiado grande (máximo ${mb} MB)` }, { status: 400 });
    }

    const ext      = getExtension(file.name, file.type);
    const filename = `${slot}.${ext}`;

    // ── Vercel Blob ──────────────────────────────────────────────────────
    if (isBlobAvailable()) {
      const { put, del } = await import('@vercel/blob');

      // Delete old blob if replacing
      if (oldUrl && oldUrl.includes('blob.vercel-storage.com')) {
        try { await del(oldUrl); } catch { /* ignore if already gone */ }
      }

      const blob = await put(`diagnoses/${diagKey}/${filename}`, file, {
        access: 'public',
        contentType: file.type,
        allowOverwrite: true,
      });
      return NextResponse.json({ url: blob.url });
    }

    // ── Local filesystem (dev / Hostinger) ───────────────────────────────
    const buffer   = Buffer.from(await file.arrayBuffer());
    const dir      = path.join(process.cwd(), 'public', 'diagnoses', diagKey);
    fs.mkdirSync(dir, { recursive: true });

    // Remove old local file with a different extension (slot name matches)
    if (oldUrl && oldUrl.startsWith('/diagnoses/')) {
      const oldPath = path.join(process.cwd(), 'public', oldUrl);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    } else {
      // Also try to remove any existing file for this slot with any extension
      for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(`${slot}.`)) {
          try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ }
        }
      }
    }

    fs.writeFileSync(path.join(dir, filename), buffer);
    return NextResponse.json({ url: `/diagnoses/${diagKey}/${filename}` });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Error interno al subir el archivo' }, { status: 500 });
  }
}

// ── DELETE: remove a file ──────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { url, password } = await request.json() as { url: string; password: string };

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!url) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    if (isBlobAvailable() && url.includes('blob.vercel-storage.com')) {
      const { del } = await import('@vercel/blob');
      await del(url);
    } else if (url.startsWith('/diagnoses/')) {
      const filePath = path.join(process.cwd(), 'public', url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Error interno al eliminar' }, { status: 500 });
  }
}
