<?php

namespace App\Http\Controllers;

use App\Models\Dtr;
use App\Models\DtrEntry;
use App\Models\Employee;
use App\Services\Audit\AuditLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class RankingController extends Controller
{
    public function __construct(protected AuditLogger $auditLogger) {}

    public function index(Request $request): Response
    {
        $prepared = $this->prepareRankingData($request);

        return Inertia::render('ranking/index', [
            'initialSelection' => [
                'month' => $prepared['month'],
                'year' => $prepared['year'],
                'calendarRange' => $prepared['calendarRange'],
            ],
            'yearOptions' => $prepared['yearOptions'],
            'rankings' => $prepared['rankings'],
        ]);
    }

    public function exportPdf(Request $request): HttpResponse
    {
        $prepared = $this->prepareRankingData($request);
        $periodLabel = $this->rankingPeriodLabel(
            $prepared['month'],
            $prepared['year'],
            $prepared['calendarRange'],
        );
        $filename = sprintf(
            'punctuality-ranking-%s-%s.pdf',
            $prepared['year'],
            str_pad((string) $prepared['month'], 2, '0', STR_PAD_LEFT),
        );

        $pdf = Pdf::loadView('pdf.ranking-summary', [
            'periodLabel' => $periodLabel,
            'rankings' => $prepared['rankings'],
        ])->setPaper('a4', 'landscape');

        $this->auditLogger->logWithoutModel('export-ranking-pdf', [
            'month' => $prepared['month'],
            'year' => $prepared['year'],
            'calendar_range' => $prepared['calendarRange'],
            'employee_count' => count($prepared['rankings']),
        ]);

        return new HttpResponse($pdf->stream($filename), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function batchExport(Request $request): HttpResponse
    {
        $prepared = $this->prepareRankingData($request);
        $employeeIds = $request->input('employeeIds', []);

        if (! is_array($employeeIds) || count($employeeIds) === 0) {
            return new HttpResponse('No employees selected for export.', 400);
        }

        $filteredRankings = collect($prepared['rankings'])
            ->filter(fn (array $r) => in_array($r['employeeId'], $employeeIds))
            ->values()
            ->all();

        $periodLabel = $this->rankingPeriodLabel(
            $prepared['month'],
            $prepared['year'],
            $prepared['calendarRange'],
        );

        $filename = sprintf(
            'ranking-batch-%s-%s.pdf',
            $prepared['year'],
            str_pad((string) $prepared['month'], 2, '0', STR_PAD_LEFT),
        );

        $pdf = Pdf::loadView('pdf.ranking-summary', [
            'periodLabel' => $periodLabel,
            'rankings' => $filteredRankings,
        ])->setPaper('a4', 'landscape');

        $this->auditLogger->logWithoutModel('export-ranking-pdf-batch', [
            'month' => $prepared['month'],
            'year' => $prepared['year'],
            'calendar_range' => $prepared['calendarRange'],
            'employee_ids' => $employeeIds,
        ]);

        return new HttpResponse($pdf->stream($filename), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @return array{month: int, year: int, calendarRange: string, yearOptions: int[], rankings: array}
     */
    protected function prepareRankingData(Request $request): array
    {
        $selectedMonth = $request->integer('month') ?: (int) now()->month;
        $selectedYear = $request->integer('year') ?: (int) now()->year;
        $selectedCalendarRange = $this->resolvedCalendarRange(
            (string) $request->query('calendar_range', 'wholeMonth'),
        );
        [$rangeStartDate, $rangeEndDate] = $this->calendarRangeBounds(
            $selectedMonth,
            $selectedYear,
            $selectedCalendarRange,
        );
        $yearOptions = array_values(range($selectedYear - 3, $selectedYear + 3));

        $dtrs = Dtr::query()
            ->with([
                'employee' => fn ($query) => $query->withTrashed(),
                'entries' => fn ($query) => $query
                    ->whereBetween('work_date', [
                        $rangeStartDate->toDateString(),
                        $rangeEndDate->toDateString(),
                    ])
                    ->orderBy('work_date'),
            ])
            ->whereHas('entries', function (Builder $query) use ($rangeEndDate, $rangeStartDate): void {
                $query->whereBetween('work_date', [
                    $rangeStartDate->toDateString(),
                    $rangeEndDate->toDateString(),
                ]);
            })
            ->get();

        return [
            'month' => $selectedMonth,
            'year' => $selectedYear,
            'calendarRange' => $selectedCalendarRange,
            'yearOptions' => $yearOptions,
            'rankings' => $this->buildRankings($dtrs),
        ];
    }

    protected function buildRankings(Collection $dtrs): array
    {
        return $dtrs
            ->groupBy('employee_id')
            ->map(function (Collection $employeeDtrs): ?array {
                $employee = $employeeDtrs->first()?->employee;

                if (! $employee instanceof Employee) {
                    return null;
                }

                $scheduleByDay = collect($this->storedSchedule($employee))->keyBy('day');
                $entries = $employeeDtrs
                    ->flatMap(fn (Dtr $dtr) => $dtr->entries)
                    ->sortBy(fn (DtrEntry $entry) => $entry->work_date?->toDateString() ?? '')
                    ->values();

                $evaluatedDays = 0;
                $onTimeDays = 0;
                $lateDays = 0;
                $totalLateMinutes = 0;

                foreach ($entries as $entry) {
                    if ($this->isAbsentEntry($entry) || $entry->time_in === null) {
                        continue;
                    }

                    $workDate = $entry->work_date instanceof Carbon
                        ? $entry->work_date->copy()
                        : Carbon::parse($entry->work_date);
                    $scheduleDay = $scheduleByDay->get((int) $workDate->dayOfWeek);
                    $lateMinutes = $this->resolveLateMinutes(
                        $this->normalizedTime($entry->time_in),
                        $scheduleDay['startTime'] ?? null,
                        (int) ($scheduleDay['graceMinutes'] ?? 0),
                    );

                    if ($lateMinutes === null) {
                        continue;
                    }

                    $evaluatedDays++;

                    if ($lateMinutes > 0) {
                        $lateDays++;
                        $totalLateMinutes += $lateMinutes;

                        continue;
                    }

                    $onTimeDays++;
                }

                if ($evaluatedDays === 0) {
                    return null;
                }

                return [
                    'employeeId' => $employee->id,
                    'employeeName' => $this->employeeName($employee),
                    'punctualityScore' => round(($onTimeDays / $evaluatedDays) * 100, 2),
                    'onTimeDays' => $onTimeDays,
                    'lateDays' => $lateDays,
                    'totalLateMinutes' => $totalLateMinutes,
                    'evaluatedDays' => $evaluatedDays,
                ];
            })
            ->filter()
            ->sort(function (array $first, array $second): int {
                $scoreComparison = $second['punctualityScore'] <=> $first['punctualityScore'];

                if ($scoreComparison !== 0) {
                    return $scoreComparison;
                }

                $onTimeComparison = $second['onTimeDays'] <=> $first['onTimeDays'];

                if ($onTimeComparison !== 0) {
                    return $onTimeComparison;
                }

                $lateDaysComparison = $first['lateDays'] <=> $second['lateDays'];

                if ($lateDaysComparison !== 0) {
                    return $lateDaysComparison;
                }

                $lateMinutesComparison = $first['totalLateMinutes'] <=> $second['totalLateMinutes'];

                if ($lateMinutesComparison !== 0) {
                    return $lateMinutesComparison;
                }

                return strcasecmp($first['employeeName'], $second['employeeName']);
            })
            ->values()
            ->map(fn (array $ranking, int $index): array => [
                'rank' => $index + 1,
                ...$ranking,
            ])
            ->all();
    }

    protected function employeeName(Employee $employee): string
    {
        $name = collect([
            $employee->first_name,
            $employee->middle_name,
            $employee->last_name,
        ])->filter()->implode(' ');

        return $name !== '' ? $name : 'Unknown employee';
    }

    protected function rankingPeriodLabel(int $month, int $year, string $calendarRange): string
    {
        $monthLabel = Carbon::create($year, $month, 1)->format('F');
        $rangeLabel = match ($calendarRange) {
            'firstTwoWeeks' => 'First two weeks',
            'lastTwoWeeks' => 'Last two weeks',
            default => 'Whole month',
        };

        return "{$monthLabel} {$year} ({$rangeLabel})";
    }

    protected function resolvedCalendarRange(string $value): string
    {
        return match ($value) {
            'firstTwoWeeks' => 'firstTwoWeeks',
            'lastTwoWeeks' => 'lastTwoWeeks',
            default => 'wholeMonth',
        };
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    protected function calendarRangeBounds(int $month, int $year, string $calendarRange): array
    {
        $monthStart = Carbon::create($year, $month, 1)->startOfDay();
        $monthEnd = $monthStart->copy()->endOfMonth()->startOfDay();

        return match ($calendarRange) {
            'firstTwoWeeks' => [
                $monthStart,
                $monthStart->copy()->day(min(15, $monthEnd->day))->startOfDay(),
            ],
            'lastTwoWeeks' => [
                $monthStart->copy()->day(min(16, $monthEnd->day))->startOfDay(),
                $monthEnd,
            ],
            default => [$monthStart, $monthEnd],
        };
    }

    /**
     * @return array<int, array{day: int, startTime: string, endTime: string, graceMinutes: int}>
     */
    protected function storedSchedule(Employee $employee): array
    {
        $storedSchedule = is_array($employee->weekly_schedule) ? $employee->weekly_schedule : [];
        $defaultGraceMinutes = max(0, (int) ($employee->grace_period_minutes ?? 0));

        if ($storedSchedule !== []) {
            return collect($storedSchedule)
                ->filter(fn (mixed $scheduleDay): bool => is_array($scheduleDay) && array_key_exists('day', $scheduleDay))
                ->map(fn (array $scheduleDay): array => [
                    'day' => (int) $scheduleDay['day'],
                    'startTime' => $this->normalizedTime($scheduleDay['start_time'] ?? $employee->scheduled_start_time),
                    'endTime' => $this->normalizedTime($scheduleDay['end_time'] ?? $employee->scheduled_end_time),
                    'graceMinutes' => max(0, (int) ($scheduleDay['grace_period_minutes'] ?? $defaultGraceMinutes)),
                ])
                ->sortBy('day')
                ->values()
                ->all();
        }

        return collect($employee->work_days ?? [])
            ->map(fn (mixed $day): array => [
                'day' => (int) $day,
                'startTime' => $this->normalizedTime($employee->scheduled_start_time),
                'endTime' => $this->normalizedTime($employee->scheduled_end_time),
                'graceMinutes' => $defaultGraceMinutes,
            ])
            ->sortBy('day')
            ->values()
            ->all();
    }

    protected function resolveLateMinutes(
        ?string $timeIn,
        mixed $scheduledTimeIn,
        int $graceMinutes,
    ): ?int {
        $actualTimeInMinutes = $this->minutesFromTime($timeIn);
        $scheduledTimeInMinutes = $this->minutesFromTime($scheduledTimeIn);

        if ($actualTimeInMinutes === null || $scheduledTimeInMinutes === null) {
            return null;
        }

        return max(
            0,
            $actualTimeInMinutes -
                $scheduledTimeInMinutes -
                max(0, $graceMinutes),
        );
    }

    protected function normalizedTime(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        return strlen($value) >= 5 ? substr($value, 0, 5) : $value;
    }

    protected function minutesFromTime(mixed $time): ?int
    {
        if (! is_string($time) || ! preg_match('/^\d{2}:\d{2}$/', $time)) {
            return null;
        }

        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $hours * 60 + $minutes;
    }

    protected function isAbsentEntry(DtrEntry $entry): bool
    {
        return $entry->time_in === null
            && $entry->time_out === null
            && (int) $entry->worked_minutes === 0
            && (float) ($entry->rate ?? 0) === 0.0;
    }
}
