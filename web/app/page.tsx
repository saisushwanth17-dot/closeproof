import { CloseRoom } from '@/components/closeroom/CloseRoom';

export default function HomePage({
  searchParams,
}: {
  searchParams?: { demo?: string };
}) {
  const isDemo = searchParams?.demo === '1' || searchParams?.demo === 'true';
  return <CloseRoom initialDemo={isDemo} />;
}
