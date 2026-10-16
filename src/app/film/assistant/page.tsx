import { FilmAssistantChat } from '@/components/film/FilmAssistantChat';

type SearchParams = {
  q?: string;
};

export default async function FilmAssistantPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const initialQuestion = params.q?.trim() || undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <FilmAssistantChat initialQuestion={initialQuestion} />
    </div>
  );
}
