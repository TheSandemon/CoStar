import NavHeader from '@/components/NavHeader';
import { AuditionPage } from '@/components/audition/AuditionPage';

export const dynamic = 'force-dynamic';

export default function AuditionRoute() {
  return (
    <>
      <NavHeader />
      <AuditionPage mode="freeform" />
    </>
  );
}
