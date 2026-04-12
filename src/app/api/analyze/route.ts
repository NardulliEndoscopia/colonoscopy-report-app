import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Language, AnalysisResult, Finding } from '@/lib/types';
import diagnosesData from '@/data/diagnoses.json';

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const languageNames: Record<Language, string> = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
  it: 'Italian',
  pt: 'Portuguese',
  de: 'German',
  nl: 'Dutch',
  pl: 'Polish',
  ro: 'Romanian',
  ar: 'Arabic',
  ru: 'Russian',
  zh: 'Chinese (Simplified)',
};

const diagnosisKeys = Object.keys(diagnosesData);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, language = 'es' }: { image: string; language: Language } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    // Extract base64 data from data URL
    const base64Match = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const mediaType = `image/${base64Match[1]}` as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const base64Data = base64Match[2];

    const langName = languageNames[language] || 'Spanish';

    const prompt = `Analyze this colonoscopy report image. Extract ALL endoscopic findings/diagnoses listed.

For each finding:
1. Extract the exact medical term as written in the report (always in the original language of the report)
2. Translate that medical term into ${langName} (medical_name_translated) — use natural, correct ${langName} terminology
3. Identify anatomical location: one of [terminal_ileum, cecum, ascending_colon, hepatic_flexure, transverse_colon, splenic_flexure, descending_colon, sigmoid_colon, rectum, anal_canal, multiple, unspecified]
4. Match to one of these known diagnosis types if applicable: [${diagnosisKeys.join(', ')}]
5. Generate a patient-friendly explanation IN ${langName} with correct grammar and pronunciation for that language:
   - what_is: what is this finding (simple, clear, no medical jargon, 2-4 sentences)
   - implications: what does it mean for the patient's health (reassuring but accurate, 2-4 sentences)
   - follow_up: recommended next steps (practical advice, 2-3 sentences)

Also provide:
- overall_summary: A brief overall summary of the colonoscopy results in ${langName} (2-3 sentences, reassuring tone)
- report_date: Extract the date of the colonoscopy if visible in the report, otherwise null

Return ONLY valid JSON (no markdown, no code blocks):
{
  "findings": [
    {
      "medical_name": "exact term from report in original language",
      "medical_name_translated": "term translated to ${langName}",
      "location": "one of the valid segments",
      "overall_finding_type": "matching key from known diagnoses or empty string",
      "explanation": {
        "what_is": "patient-friendly explanation in ${langName}",
        "implications": "health implications in ${langName}",
        "follow_up": "next steps in ${langName}"
      }
    }
  ],
  "overall_summary": "summary in ${langName}",
  "report_date": "date string or null"
}

If this is not a colonoscopy report or cannot be read, return:
{"error": "Not a colonoscopy report"}

Language for all explanations: ${langName}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      system: "You are a medical information assistant for Dr. Gianfranco Nardulli Fernández's colonoscopy platform (endoscopianardulli.es). Analyze colonoscopy reports and provide clear, patient-friendly explanations. Always be accurate but reassuring. Never exaggerate risks. Remind patients to consult their doctor for personalized advice.",
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 });
    }

    // Clean up any markdown code blocks if present
    let jsonText = content.text.trim();
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

    let parsed: { error?: string; findings?: Finding[]; overall_summary?: string; report_date?: string | null };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!parsed.findings || !Array.isArray(parsed.findings)) {
      return NextResponse.json({ error: 'Invalid response structure' }, { status: 500 });
    }

    // Add sequential IDs to each finding
    const findingsWithIds: Finding[] = parsed.findings.map((finding, index) => ({
      ...finding,
      id: `finding-${index + 1}`,
    }));

    const result: AnalysisResult = {
      findings: findingsWithIds,
      overall_summary: parsed.overall_summary || '',
      report_date: parsed.report_date ?? null,
    };

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Analysis error:', error);
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: error.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
