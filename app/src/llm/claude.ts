/** Optional: grade a learner's translation with Claude, directly from the
 *  browser. Needs an API key stored in settings; nothing is sent otherwise. */

export interface Grade { score: 0 | 1 | 2; comment: string }

export async function gradeTranslation(opts: {
  apiKey: string; model: string; greek: string; reference: string; attempt: string;
}): Promise<Grade> {
  // loaded on demand so the SDK is not in the main bundle for people who never grade
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: opts.model,
    max_tokens: 400,
    output_config: { effort: 'low' },
    system:
      'You grade a beginner\'s translation of an Ancient Greek sentence. Judge meaning, not wording: a free rendering that keeps the sense is correct. ' +
      'Reply with one line "SCORE: 0|1|2" (2 = meaning right, 1 = partly right, 0 = wrong), then one or two short sentences saying what, if anything, was misread, naming the Greek word or construction.',
    messages: [{
      role: 'user',
      content: `Greek: ${opts.greek}\nReference translation (may cover more than this sentence): ${opts.reference}\nLearner's translation: ${opts.attempt}`,
    }],
  });
  if (response.stop_reason === 'refusal') return { score: 1, comment: 'The grader declined this request; compare with the reference yourself.' };
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const m = /SCORE:\s*([012])/.exec(text);
  const score = (m ? Number(m[1]) : 1) as 0 | 1 | 2;
  return { score, comment: text.replace(/SCORE:\s*[012]\s*/, '').trim() };
}
