<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();

        if (! $user->isEmployee()) {
            abort(403, 'Unauthorized access.');
        }

        $employee = $user->employee;

        if (! $employee) {
            abort(404, 'Employee profile not found.');
        }

        $selectedMonth = $request->integer('month') ?: (int) now()->month;
        $selectedYear = $request->integer('year') ?: (int) now()->year;

        $scheduleData = $this->parseSchedule($employee, $selectedMonth, $selectedYear);

        return Inertia::render('schedule/index', [
            'employee' => [
                'first_name' => $employee->first_name,
                'last_name' => $employee->last_name,
                'scheduled_start_time' => $employee->scheduled_start_time,
                'scheduled_end_time' => $employee->scheduled_end_time,
                'work_days' => $employee->work_days ?? [],
                'weekly_schedule' => $employee->weekly_schedule ?? [],
            ],
            'schedule' => $scheduleData,
            'selectedMonth' => $selectedMonth,
            'selectedYear' => $selectedYear,
        ]);
    }

    protected function parseSchedule($employee, int $month, int $year): array
    {
        $storedSchedule = is_array($employee->weekly_schedule) ? $employee->weekly_schedule : [];
        $defaultStartTime = $employee->scheduled_start_time ?? '08:00';
        $defaultEndTime = $employee->scheduled_end_time ?? '17:00';

        $scheduleByDay = [];

        if ($storedSchedule !== []) {
            foreach ($storedSchedule as $scheduleDay) {
                if (is_array($scheduleDay) && array_key_exists('day', $scheduleDay)) {
                    $day = (int) $scheduleDay['day'];
                    $scheduleByDay[$day] = [
                        'day' => $day,
                        'start_time' => $this->normalizedTime($scheduleDay['start_time'] ?? $defaultStartTime),
                        'end_time' => $this->normalizedTime($scheduleDay['end_time'] ?? $defaultEndTime),
                    ];
                }
            }
        } else {
            foreach ($employee->work_days ?? [] as $day) {
                $day = (int) $day;
                $scheduleByDay[$day] = [
                    'day' => $day,
                    'start_time' => $this->normalizedTime($defaultStartTime),
                    'end_time' => $this->normalizedTime($defaultEndTime),
                ];
            }
        }

        $monthStart = Carbon::create($year, $month, 1);
        $monthEnd = $monthStart->copy()->endOfMonth();
        $calendarDays = [];
        $scheduledDaysCount = 0;
        $totalMinutesPerMonth = 0;

        $dailyMinutes = 0;
        if ($scheduleByDay !== []) {
            $sampleDay = reset($scheduleByDay);
            $startMin = $this->minutesFromTime($sampleDay['start_time']);
            $endMin = $this->minutesFromTime($sampleDay['end_time']);
            if ($startMin !== null && $endMin !== null && $endMin > $startMin) {
                $dailyMinutes = $endMin - $startMin;
            }
        }

        $current = $monthStart->copy()->startOfWeek(Carbon::SUNDAY);
        while ($current->lte($monthEnd->copy()->endOfWeek(Carbon::SATURDAY))) {
            $dayOfWeek = (int) $current->dayOfWeek;
            $isInMonth = $current->month === $month && $current->year === $year;
            $isScheduled = isset($scheduleByDay[$dayOfWeek]);

            $calendarDays[] = [
                'date' => $current->toDateString(),
                'day' => $current->day,
                'dayOfWeek' => $dayOfWeek,
                'isInMonth' => $isInMonth,
                'isScheduled' => $isScheduled && $isInMonth,
                'start_time' => $isScheduled ? $scheduleByDay[$dayOfWeek]['start_time'] : null,
                'end_time' => $isScheduled ? $scheduleByDay[$dayOfWeek]['end_time'] : null,
            ];

            if ($isInMonth && $isScheduled) {
                $scheduledDaysCount++;
                $totalMinutesPerMonth += $dailyMinutes;
            }

            $current->addDay();
        }

        $today = Carbon::today();
        $nextShift = null;
        $upcomingShifts = [];

        $checkDate = $monthStart->copy();
        while ($checkDate->lte($monthEnd)) {
            $dayOfWeek = (int) $checkDate->dayOfWeek;
            if (isset($scheduleByDay[$dayOfWeek])) {
                $shift = [
                    'date' => $checkDate->toDateString(),
                    'date_formatted' => $checkDate->format('M d, Y'),
                    'day_name' => $checkDate->format('l'),
                    'shift_name' => $this->resolveShiftName(
                        $scheduleByDay[$dayOfWeek]['start_time'],
                        $scheduleByDay[$dayOfWeek]['end_time'],
                    ),
                    'start_time' => $scheduleByDay[$dayOfWeek]['start_time'],
                    'end_time' => $scheduleByDay[$dayOfWeek]['end_time'],
                    'duration_hours' => $this->calculateDurationHours(
                        $scheduleByDay[$dayOfWeek]['start_time'],
                        $scheduleByDay[$dayOfWeek]['end_time'],
                    ),
                    'is_past' => $checkDate->lt($today),
                ];

                if ($nextShift === null && ! $shift['is_past']) {
                    $nextShift = $shift;
                }

                if (! $shift['is_past']) {
                    $upcomingShifts[] = $shift;
                }
            }
            $checkDate->addDay();
        }

        return [
            'calendar_days' => $calendarDays,
            'scheduled_days_count' => $scheduledDaysCount,
            'total_hours' => round($totalMinutesPerMonth / 60, 1),
            'next_shift' => $nextShift,
            'upcoming_shifts' => array_slice($upcomingShifts, 0, 5),
            'schedule_by_day' => $scheduleByDay,
        ];
    }

    protected function resolveShiftName(?string $startTime, ?string $endTime): string
    {
        $startHour = null;
        if (is_string($startTime) && preg_match('/^(\d{2}):/', $startTime, $m)) {
            $startHour = (int) $m[1];
        }

        if ($startHour === null) {
            return 'Work Shift';
        }

        return match (true) {
            $startHour >= 5 && $startHour < 12 => 'Morning Shift',
            $startHour >= 12 && $startHour < 17 => 'Afternoon Shift',
            $startHour >= 17 && $startHour < 21 => 'Evening Shift',
            default => 'Night Shift',
        };
    }

    protected function normalizedTime(?string $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        return strlen($value) >= 5 ? substr($value, 0, 5) : $value;
    }

    protected function minutesFromTime(?string $time): ?int
    {
        if (! is_string($time) || ! preg_match('/^\d{2}:\d{2}$/', $time)) {
            return null;
        }

        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $hours * 60 + $minutes;
    }

    protected function calculateDurationHours(?string $startTime, ?string $endTime): float
    {
        $startMinutes = $this->minutesFromTime($startTime);
        $endMinutes = $this->minutesFromTime($endTime);

        if ($startMinutes === null || $endMinutes === null || $endMinutes <= $startMinutes) {
            return 0;
        }

        return round(($endMinutes - $startMinutes) / 60, 1);
    }
}
