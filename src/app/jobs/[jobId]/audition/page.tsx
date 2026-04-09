import NavHeader from '@/components/NavHeader';
import { AuditionPage } from '@/components/audition/AuditionPage';

interface Props {
  params: { jobId: string };
}

export default function AuditionRoute({ params }: Props) {
  return (
    <>
      <NavHeader />
      <AuditionPage jobId={params.jobId} />
    </>
  );
}
