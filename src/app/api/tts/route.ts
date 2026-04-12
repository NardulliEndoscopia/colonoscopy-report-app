import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Neural voices — one native female voice per supported language
const voiceMap: Record<string, string> = {
  es: 'es-ES-ElviraNeural',
  en: 'en-GB-SoniaNeural',
  fr: 'fr-FR-DeniseNeural',
  it: 'it-IT-ElsaNeural',
  pt: 'pt-PT-RaquelNeural',
  de: 'de-DE-KatjaNeural',
  nl: 'nl-NL-ColetteNeural',
  pl: 'pl-PL-ZofiaNeural',
  ro: 'ro-RO-AlinaNeural',
  ar: 'ar-SA-ZariyahNeural',
  ru: 'ru-RU-SvetlanaNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
};

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const voice = voiceMap[language] ?? voiceMap['es'];

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });
    const audio = Buffer.concat(chunks);

    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}
