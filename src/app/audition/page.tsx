import NavHeader from '@/components/NavHeader';
import { AuditionPage } from '@/components/audition/AuditionPage';

export default function AuditionRoute() {
  return (
    <>
      <NavHeader />
      <AuditionPage mode="freeform" />
    </>
  );
}
