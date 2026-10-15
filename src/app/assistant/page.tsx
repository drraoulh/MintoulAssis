import { AssistantChat } from '@/components/assistant/AssistantChat';

/**
 * Full-height conversational assistant — no site footer (AppShell).
 * Server page passes searchParams as props (no useSearchParams bailout).
 */
type AssistantSearchParams = {
  q?: string;
  voice?: string;
  vision?: string;
};

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<AssistantSearchParams>;
}) {
  const params = await searchParams;
  const initialQuestion = params.q?.trim() || undefined;
  const autoVoice = params.voice === '1';
  const autoVision = params.vision === '1';

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AssistantChat
        initialQuestion={initialQuestion}
        autoVoice={autoVoice}
        autoVision={autoVision}
      />
    </div>
  );
}
