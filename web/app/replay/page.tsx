import { CloseRoom } from '@/components/closeroom/CloseRoom';

export const metadata = {
  title: 'Deterministic Replay Demo',
  description: 'Deterministic replay of CloseProof month-end reconciliation across 8 forensic accounting anomalies.',
};

export default function ReplayPage() {
  return <CloseRoom initialMode="replay" />;
}
