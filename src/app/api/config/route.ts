import { NextRequest, NextResponse } from 'next/server';
import { DoctorConfig } from '@/lib/types';
import path from 'path';
import fs from 'fs';

const KV_KEY = 'nardulli_doctor_config';
const CONFIG_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'doctor-config-live.json');

function isKvAvailable() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function readFromKv(): Promise<DoctorConfig> {
  const { kv } = await import('@vercel/kv');
  const config = await kv.get<DoctorConfig>(KV_KEY);
  return config ?? {};
}

async function writeToKv(config: DoctorConfig): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(KV_KEY, config);
}

function readFromFile(): DoctorConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')) as DoctorConfig;
    }
  } catch { /* ignore */ }
  try {
    const envConfig = process.env.NEXT_PUBLIC_DOCTOR_CONFIG;
    if (envConfig) return JSON.parse(envConfig) as DoctorConfig;
  } catch { /* ignore */ }
  return {};
}

function writeToFile(config: DoctorConfig): void {
  const dir = path.dirname(CONFIG_FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const config = isKvAvailable() ? await readFromKv() : readFromFile();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Config GET error:', error);
    return NextResponse.json({});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, config }: { password: string; config?: DoctorConfig } = body;

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 });
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // Auth only (no config provided)
    if (!config) {
      return NextResponse.json({ success: true, authenticated: true });
    }

    // Save config
    if (isKvAvailable()) {
      await writeToKv(config);
    } else {
      writeToFile(config);
    }

    return NextResponse.json({ success: true, saved: true });
  } catch (error) {
    console.error('Config POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
