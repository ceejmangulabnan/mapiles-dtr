import SchedulePageContent from './components/schedule-page-content';
import type { SchedulePageProps } from './helpers/schedule-page';

export default function Schedule(props: SchedulePageProps) {
    return <SchedulePageContent {...props} />;
}
