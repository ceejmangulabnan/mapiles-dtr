import { Head, router } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import Heading from '@/components/heading';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { index as scheduleIndex } from '@/routes/schedule';
import {
    breadcrumbs,
    dayLabels,
    formatDuration,
    formatTime,
    getMonthLabel,
    getYearOptions,
    monthOptions,
} from '../helpers/schedule-page';
import type { SchedulePageProps } from '../helpers/schedule-page';

export default function SchedulePageContent({
    schedule,
    selectedMonth,
    selectedYear,
}: SchedulePageProps) {
    const yearOptions = getYearOptions();

    const visitWithFilters = (month: string, year: string) => {
        router.get(
            scheduleIndex.url({
                query: {
                    month: Number(month),
                    year: Number(year),
                },
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const navigateMonth = (direction: number) => {
        let newMonth = selectedMonth + direction;
        let newYear = selectedYear;

        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }

        visitWithFilters(newMonth.toString(), newYear.toString());
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Schedule" />

            <div className="flex flex-1 flex-col gap-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="My Schedule"
                        description="Your assigned shifts for the selected period. This view is read-only."
                    />
                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedMonth.toString()}
                            onValueChange={(value) =>
                                visitWithFilters(value, selectedYear.toString())
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map((month) => (
                                    <SelectItem
                                        key={month.value}
                                        value={month.value.toString()}
                                    >
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedYear.toString()}
                            onValueChange={(value) =>
                                visitWithFilters(selectedMonth.toString(), value)
                            }
                        >
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((year) => (
                                    <SelectItem
                                        key={year}
                                        value={year.toString()}
                                    >
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Scheduled Shifts</CardDescription>
                            <CardTitle className="text-3xl font-bold">
                                {schedule.scheduled_days_count}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Next Shift</CardDescription>
                            <CardTitle className="text-lg font-semibold">
                                {schedule.next_shift
                                    ? `${schedule.next_shift.day_name}, ${schedule.next_shift.date_formatted}`
                                    : 'No upcoming shifts'}
                            </CardTitle>
                            {schedule.next_shift && (
                                <p className="text-sm text-muted-foreground">
                                    {formatTime(schedule.next_shift.start_time)} &ndash; {formatTime(schedule.next_shift.end_time)}
                                </p>
                            )}
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total Hours</CardDescription>
                            <CardTitle className="text-3xl font-bold">
                                {formatDuration(schedule.total_hours)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    {getMonthLabel(selectedMonth)} {selectedYear}
                                </CardTitle>
                                <CardDescription>
                                    Your monthly schedule calendar
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigateMonth(-1)}
                                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                    &larr;
                                </button>
                                <button
                                    onClick={() => navigateMonth(1)}
                                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                    &rarr;
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-1">
                            {dayLabels.map((dayLabel) => (
                                <div
                                    key={dayLabel}
                                    className="p-2 text-center text-sm font-medium text-muted-foreground"
                                >
                                    {dayLabel}
                                </div>
                            ))}

                            {schedule.calendar_days.map((calendarDay, index) => (
                                <div
                                    key={index}
                                    className={`
                                        relative flex h-20 flex-col items-center justify-center rounded-md p-1
                                        ${!calendarDay.isInMonth ? 'bg-transparent' : ''}
                                        ${calendarDay.isInMonth && calendarDay.isScheduled ? 'bg-[#10b981]' : ''}
                                        ${calendarDay.isInMonth && !calendarDay.isScheduled ? 'bg-muted/20' : ''}
                                    `}
                                >
                                    {calendarDay.isInMonth && (
                                        <>
                                            <span
                                                className={`
                                                    text-sm font-medium
                                                    ${calendarDay.isScheduled ? 'text-white' : 'text-muted-foreground'}
                                                `}
                                            >
                                                {calendarDay.day}
                                            </span>
                                            {calendarDay.isScheduled && calendarDay.start_time && (
                                                <span className="mt-1 text-center text-[10px] leading-tight text-white/80">
                                                    {formatTime(calendarDay.start_time)}
                                                </span>
                                            )}
                                            {calendarDay.isScheduled && (
                                                <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm bg-[#10b981]" />
                                <span className="text-sm text-muted-foreground">Scheduled</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm bg-muted/20" />
                                <span className="text-sm text-muted-foreground">Day Off</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm border border-dashed border-border" />
                                <span className="text-sm text-muted-foreground">No data</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {schedule.upcoming_shifts.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Shifts</CardTitle>
                            <CardDescription>
                                Your next scheduled shifts for this month.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {schedule.upcoming_shifts.map((shift, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 rounded-lg border border-border p-4"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b981]/10">
                                            <Clock className="h-5 w-5 text-[#10b981]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">
                                                {shift.shift_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {shift.day_name}, {shift.date_formatted}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-foreground">
                                                {formatTime(shift.start_time)} &ndash; {formatTime(shift.end_time)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                &bull; {formatDuration(shift.duration_hours)}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-[#10b981]/10 px-3 py-1 text-xs font-medium text-[#10b981]">
                                            Scheduled
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
