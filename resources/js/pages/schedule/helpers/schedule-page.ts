import { index as scheduleIndex } from '@/routes/schedule';
import type { BreadcrumbItem } from '@/types';

export interface ScheduleDay {
    day: number;
    start_time: string;
    end_time: string;
}

export interface CalendarDay {
    date: string;
    day: number;
    dayOfWeek: number;
    isInMonth: boolean;
    isScheduled: boolean;
    start_time: string | null;
    end_time: string | null;
}

export interface Shift {
    date: string;
    date_formatted: string;
    day_name: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    is_past: boolean;
}

export interface ScheduleData {
    calendar_days: CalendarDay[];
    scheduled_days_count: number;
    total_hours: number;
    next_shift: Shift | null;
    upcoming_shifts: Shift[];
    schedule_by_day: Record<number, ScheduleDay>;
}

export interface EmployeeData {
    first_name: string;
    last_name: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    work_days: number[];
    weekly_schedule: ScheduleDay[];
}

export type SchedulePageProps = {
    employee: EmployeeData;
    schedule: ScheduleData;
    selectedMonth: number;
    selectedYear: number;
};

export const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Schedule',
        href: scheduleIndex(),
    },
];

export const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

export const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatDuration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (minutes === 0) {
        return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''}`;
    }

    return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''} ${minutes} min`;
}

export function getMonthLabel(month: number): string {
    return monthOptions.find((m) => m.value === month)?.label ?? '';
}

export function getYearOptions(): number[] {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
}
