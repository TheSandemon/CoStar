import { FeedbackReportScreen } from '@/components/audition/FeedbackReportScreen';

interface Props {
  params: { sessionId: string };
}

export default function SessionFeedbackPage({ params }: Props) {
  return <FeedbackReportScreen sessionId={params.sessionId} />;
}
