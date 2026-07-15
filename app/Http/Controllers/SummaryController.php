<?php

namespace App\Http\Controllers;

use App\Models\Dtr;
use App\Services\Audit\AuditLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use ZipArchive;

class SummaryController extends Controller
{
    public function __construct(protected AuditLogger $auditLogger) {}

    public function index(): Response
    {

        $dtrRecords = Dtr::query()
            ->with([
                'employee.user',
                'entries' => fn ($query) => $query->orderBy('work_date'),
            ])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('summary/index', [
            'dtrs' => $dtrRecords->map(function (Dtr $dtr): array {
                $periodDate = $this->resolvedPeriodDate($dtr);

                return [
                    'id' => $dtr->id,
                    'employeeId' => $dtr->employee_id,
                    'employeeStatus' => $dtr->employee?->user?->status?->value ?? 'active',
                    'employeeName' => $dtr->employee?->first_name !== null
                        ? collect([
                            $dtr->employee?->first_name,
                            $dtr->employee?->middle_name,
                            $dtr->employee?->last_name,
                        ])->filter()->implode(' ')
                        : 'Unknown employee',
                    'month' => (int) $periodDate->month,
                    'monthLabel' => $periodDate->format('F'),
                    'year' => (int) $periodDate->year,
                    'totalDays' => $dtr->total_days,
                    'totalWorkedMinutes' => $dtr->total_worked_minutes,
                    'regularAmount' => $this->resolvedRegularAmount($dtr),
                    'dailyRateBasis' => $this->resolvedDailyRateBasis($dtr),
                    'totalOvertimeMinutes' => (int) $dtr->total_overtime_minutes,
                    'totalOvertimeAmount' => $dtr->total_overtime_amount !== null ? (string) $dtr->total_overtime_amount : '0.00',
                    'sssDeduction' => $dtr->sss_deduction !== null ? (string) $dtr->sss_deduction : '0.00',
                    'pagibigDeduction' => $dtr->pagibig_deduction !== null ? (string) $dtr->pagibig_deduction : '0.00',
                    'totalAmount' => $dtr->total_amount !== null ? (string) $dtr->total_amount : '0.00',
                    'holidayPremium' => (string) ($dtr->entries->sum(
                        fn ($entry): float => (float) ($entry->rate ?? 0) > (float) ($entry->base_rate ?? 0)
                            ? (float) ($entry->base_rate ?? 0) * max(0, $this->holidayMultiplier((string) $entry->holiday_type) - 1)
                            : 0,
                    )),
                    'confirmedAt' => ($dtr->updated_at ?? $dtr->created_at)?->toIso8601String(),
                    'entries' => $dtr->entries->map(function ($entry): array {
                        $workDate = Carbon::parse($entry->work_date);

                        return [
                            'date' => $workDate->toDateString(),
                            'label' => $workDate->format('M j'),
                            'weekday' => $workDate->format('l'),
                            'timeIn' => $entry->time_in !== null ? substr($entry->time_in, 0, 5) : '',
                            'timeOut' => $entry->time_out !== null ? substr($entry->time_out, 0, 5) : '',
                            'holidayType' => (string) $entry->holiday_type,
                            'workedMinutes' => (int) $entry->worked_minutes,
                            'baseRate' => $entry->base_rate !== null ? (string) $entry->base_rate : '',
                            'rate' => $entry->rate !== null ? (string) $entry->rate : '',
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ]);
    }

    public function export(Request $request, Dtr $dtr): HttpResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return new HttpResponse('You are not authorized to export employee DTRs.', 403);
        }

        $dtr->load(['employee', 'entries' => fn ($query) => $query->orderBy('work_date')]);

        $periodDate = $this->resolvedPeriodDate($dtr);
        $month = (int) $periodDate->month;
        $year = (int) $periodDate->year;
        $monthLabel = $periodDate->format('F');
        $employeeName = $dtr->employee?->first_name !== null
            ? collect([$dtr->employee?->first_name, $dtr->employee?->middle_name, $dtr->employee?->last_name])->filter()->implode(' ')
            : 'Unknown employee';
        $regularAmount = $this->resolvedRegularAmount($dtr);
        $dailyRateBasis = $this->resolvedDailyRateBasis($dtr);
        $hasOvertime = (int) $dtr->total_overtime_minutes > 0;

        $employee = $dtr->employee;
        $hourlyRate = $this->resolvedHourlyRateForEmployee($employee);
        $scheduleByDay = collect($this->storedSchedule($employee))->keyBy('day');

        $filename = sprintf(
            'dtr-%s-%s-%s.pdf',
            preg_replace('/[^a-z0-9]+/', '-', strtolower($employeeName)),
            $year,
            str_pad((string) $month, 2, '0', STR_PAD_LEFT),
        );

        $watermarkLabel = $request->user()->isAdmin() ? "Admin's Copy" : "Management's Copy";

        $entriesData = $dtr->entries->map(function ($entry) use ($scheduleByDay, $hourlyRate): array {
            $workDate = Carbon::parse($entry->work_date);
            $scheduleDay = $scheduleByDay->get((int) $workDate->dayOfWeek);

            $timeIn = $entry->time_in !== null ? substr($entry->time_in, 0, 5) : '';
            $timeOut = $entry->time_out !== null ? substr($entry->time_out, 0, 5) : '';
            $workedMinutes = (int) $entry->worked_minutes;
            $rate = (float) ($entry->rate ?? 0);

            $isAbsent = $timeIn === ''
                && $timeOut === ''
                && $workedMinutes === 0
                && $rate === 0.0;

            $isAbsentOnRegularHoliday = $isAbsent && (string) $entry->holiday_type === 'regularHoliday';

            $scheduledWorkedMinutes = 0;
            $scheduledTimeInMinutes = null;
            $graceMinutes = 0;
            if (! $isAbsent && $scheduleDay) {
                $scheduledWorkedMinutes = $this->resolveWorkedMinutesFromSchedule(
                    $scheduleDay['startTime'] ?? null,
                    $scheduleDay['endTime'] ?? null,
                );
                $scheduledTimeInMinutes = $this->minutesFromTimeString($scheduleDay['startTime'] ?? null);
                $graceMinutes = (int) ($employee->grace_period_minutes ?? 0);
            }

            $overtimeMinutes = $isAbsent ? 0 : max(0, $workedMinutes - $scheduledWorkedMinutes);

            $isHalfDayLateArrival = false;
            $isLate = false;
            if (! $isAbsent && $timeIn !== '' && $scheduledTimeInMinutes !== null) {
                $actualTimeInMinutes = $this->minutesFromTimeString($timeIn);
                if ($actualTimeInMinutes !== null) {
                    $isHalfDayLateArrival = $actualTimeInMinutes >= $scheduledTimeInMinutes + 180;
                    $isLate = ! $isHalfDayLateArrival && $actualTimeInMinutes > $scheduledTimeInMinutes + $graceMinutes;
                }
            }

            $isHalfDayEarlyOut = ! $isAbsent && $workedMinutes > 0 && $workedMinutes <= 240;

            $isHalfDay = $isHalfDayLateArrival || $isHalfDayEarlyOut;

            $isOvertime = $overtimeMinutes > 0;

            $overtimeAmount = $isOvertime ? ($overtimeMinutes / 60) * $hourlyRate * 1.25 : 0;
            $rateWithOvertime = $rate + $overtimeAmount;

            return [
                'date' => $workDate->toDateString(),
                'label' => $workDate->format('M j'),
                'weekday' => $workDate->format('l'),
                'timeIn' => $timeIn,
                'timeOut' => $timeOut,
                'holidayType' => (string) $entry->holiday_type,
                'workedMinutes' => $workedMinutes,
                'baseRate' => $entry->base_rate !== null ? (string) $entry->base_rate : '',
                'rate' => $entry->rate !== null ? (string) $entry->rate : '',
                'rateWithOvertime' => number_format(round($rateWithOvertime, 2), 2, '.', ''),
                'isAbsent' => $isAbsent,
                'isAbsentOnRegularHoliday' => $isAbsentOnRegularHoliday,
                'isHalfDay' => $isHalfDay,
                'isLate' => $isLate,
                'isOvertime' => $isOvertime,
                'overtimeMinutes' => $overtimeMinutes,
            ];
        })->values()->all();

        $pdf = Pdf::loadView('pdf.dtr-summary', [
            'employeeName' => $employeeName,
            'monthLabel' => $monthLabel,
            'year' => $year,
            'totalDays' => $dtr->total_days,
            'totalWorkedMinutes' => $dtr->total_worked_minutes,
            'regularAmount' => $regularAmount,
            'dailyRateBasis' => $dailyRateBasis,
            'confirmedAt' => ($dtr->updated_at ?? $dtr->created_at)?->tz('Asia/Manila')->format('M j, Y, g:i A'),
            'totalOvertimeMinutes' => (int) $dtr->total_overtime_minutes,
            'totalOvertimeAmount' => $dtr->total_overtime_amount !== null ? (string) $dtr->total_overtime_amount : '0.00',
            'sssDeduction' => $dtr->sss_deduction !== null ? (string) $dtr->sss_deduction : '0.00',
            'pagibigDeduction' => $dtr->pagibig_deduction !== null ? (string) $dtr->pagibig_deduction : '0.00',
            'totalAmount' => $dtr->total_amount !== null ? (string) $dtr->total_amount : '0.00',
            'watermarkLabel' => $watermarkLabel,
            'entries' => $entriesData,
        ])->setPaper('a4', 'portrait');

        $this->auditLogger->log('export-dtr-pdf', $dtr);

        return new HttpResponse($pdf->stream($filename), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function batchExport(Request $request): HttpResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return new HttpResponse('You are not authorized to export employee DTRs.', 403);
        }

        $ids = $request->input('ids', []);

        if (! is_array($ids) || count($ids) === 0) {
            return new HttpResponse('No DTRs selected for export.', 400);
        }

        $dtrs = Dtr::query()
            ->with(['employee', 'entries' => fn ($q) => $q->orderBy('work_date')])
            ->whereIn('id', $ids)
            ->get();

        if ($dtrs->isEmpty()) {
            return new HttpResponse('No DTRs found for the given IDs.', 404);
        }

        $watermarkLabel = $request->user()->isAdmin() ? "Admin's Copy" : "Management's Copy";

        $zip = new ZipArchive;
        $zipPath = tempnam(sys_get_temp_dir(), 'dtr-batch-').'.zip';

        if ($zip->open($zipPath, ZipArchive::CREATE) !== true) {
            return new HttpResponse('Could not create ZIP archive.', 500);
        }

        foreach ($dtrs as $dtr) {
            $periodDate = $this->resolvedPeriodDate($dtr);
            $month = (int) $periodDate->month;
            $year = (int) $periodDate->year;
            $monthLabel = $periodDate->format('F');
            $employeeName = $dtr->employee?->first_name !== null
                ? collect([$dtr->employee?->first_name, $dtr->employee?->middle_name, $dtr->employee?->last_name])->filter()->implode(' ')
                : 'Unknown employee';
            $regularAmount = $this->resolvedRegularAmount($dtr);
            $dailyRateBasis = $this->resolvedDailyRateBasis($dtr);

            $employee = $dtr->employee;
            $hourlyRate = $this->resolvedHourlyRateForEmployee($employee);
            $scheduleByDay = collect($this->storedSchedule($employee))->keyBy('day');

            $filename = sprintf(
                'dtr-%s-%s-%s.pdf',
                preg_replace('/[^a-z0-9]+/', '-', strtolower($employeeName)),
                $year,
                str_pad((string) $month, 2, '0', STR_PAD_LEFT),
            );

            $entriesData = $dtr->entries->map(function ($entry) use ($scheduleByDay, $hourlyRate): array {
                $workDate = Carbon::parse($entry->work_date);
                $scheduleDay = $scheduleByDay->get((int) $workDate->dayOfWeek);

                $timeIn = $entry->time_in !== null ? substr($entry->time_in, 0, 5) : '';
                $timeOut = $entry->time_out !== null ? substr($entry->time_out, 0, 5) : '';
                $workedMinutes = (int) $entry->worked_minutes;
                $rate = (float) ($entry->rate ?? 0);

                $isAbsent = $timeIn === ''
                    && $timeOut === ''
                    && $workedMinutes === 0
                    && $rate === 0.0;

                $isAbsentOnRegularHoliday = $isAbsent && (string) $entry->holiday_type === 'regularHoliday';

                $scheduledWorkedMinutes = 0;
                $scheduledTimeInMinutes = null;
                $graceMinutes = 0;
                if (! $isAbsent && $scheduleDay) {
                    $scheduledWorkedMinutes = $this->resolveWorkedMinutesFromSchedule(
                        $scheduleDay['startTime'] ?? null,
                        $scheduleDay['endTime'] ?? null,
                    );
                    $scheduledTimeInMinutes = $this->minutesFromTimeString($scheduleDay['startTime'] ?? null);
                    $graceMinutes = (int) ($employee->grace_period_minutes ?? 0);
                }

                $overtimeMinutes = $isAbsent ? 0 : max(0, $workedMinutes - $scheduledWorkedMinutes);

                $isHalfDayLateArrival = false;
                $isLate = false;
                if (! $isAbsent && $timeIn !== '' && $scheduledTimeInMinutes !== null) {
                    $actualTimeInMinutes = $this->minutesFromTimeString($timeIn);
                    if ($actualTimeInMinutes !== null) {
                        $isHalfDayLateArrival = $actualTimeInMinutes >= $scheduledTimeInMinutes + 180;
                        $isLate = ! $isHalfDayLateArrival && $actualTimeInMinutes > $scheduledTimeInMinutes + $graceMinutes;
                    }
                }

                $isHalfDayEarlyOut = ! $isAbsent && $workedMinutes > 0 && $workedMinutes <= 240;

                $isHalfDay = $isHalfDayLateArrival || $isHalfDayEarlyOut;

                $isOvertime = $overtimeMinutes > 0;

                $overtimeAmount = $isOvertime ? ($overtimeMinutes / 60) * $hourlyRate * 1.25 : 0;
                $rateWithOvertime = $rate + $overtimeAmount;

                return [
                    'date' => $workDate->toDateString(),
                    'label' => $workDate->format('M j'),
                    'weekday' => $workDate->format('l'),
                    'timeIn' => $timeIn,
                    'timeOut' => $timeOut,
                    'holidayType' => (string) $entry->holiday_type,
                    'workedMinutes' => $workedMinutes,
                    'baseRate' => $entry->base_rate !== null ? (string) $entry->base_rate : '',
                    'rate' => $entry->rate !== null ? (string) $entry->rate : '',
                    'rateWithOvertime' => number_format(round($rateWithOvertime, 2), 2, '.', ''),
                    'isAbsent' => $isAbsent,
                    'isAbsentOnRegularHoliday' => $isAbsentOnRegularHoliday,
                    'isHalfDay' => $isHalfDay,
                    'isLate' => $isLate,
                    'isOvertime' => $isOvertime,
                    'overtimeMinutes' => $overtimeMinutes,
                ];
            })->values()->all();

            $pdf = Pdf::loadView('pdf.dtr-summary', [
                'employeeName' => $employeeName,
                'monthLabel' => $monthLabel,
                'year' => $year,
                'totalDays' => $dtr->total_days,
                'totalWorkedMinutes' => $dtr->total_worked_minutes,
                'regularAmount' => $regularAmount,
                'dailyRateBasis' => $dailyRateBasis,
                'confirmedAt' => ($dtr->updated_at ?? $dtr->created_at)?->tz('Asia/Manila')->format('M j, Y, g:i A'),
                'totalOvertimeMinutes' => (int) $dtr->total_overtime_minutes,
                'totalOvertimeAmount' => $dtr->total_overtime_amount !== null ? (string) $dtr->total_overtime_amount : '0.00',
                'sssDeduction' => $dtr->sss_deduction !== null ? (string) $dtr->sss_deduction : '0.00',
                'pagibigDeduction' => $dtr->pagibig_deduction !== null ? (string) $dtr->pagibig_deduction : '0.00',
                'totalAmount' => $dtr->total_amount !== null ? (string) $dtr->total_amount : '0.00',
                'watermarkLabel' => $watermarkLabel,
                'entries' => $entriesData,
            ])->setPaper('a4', 'portrait');

            $pdfContent = $pdf->output();
            $zip->addFromString($filename, $pdfContent);
        }

        $zip->close();

        $zipFilename = 'dtr-batch-export-'.now()->format('Y-m-d-His').'.zip';

        $this->auditLogger->logWithoutModel('export-dtr-pdf-batch', [
            'count' => $dtrs->count(),
            'dtr_ids' => $ids,
        ]);

        return new HttpResponse(file_get_contents($zipPath), 200, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="'.$zipFilename.'"',
            'Content-Length' => filesize($zipPath),
        ]);
    }

    public function destroy(Request $request, Dtr $dtr): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return back()->with('error', 'You do not have permission to delete employee DTRs.');
        }

        $dtr->delete();

        return to_route('summary.index')->with('success', 'DTR deleted successfully.');
    }

    public function batchDestroy(Request $request): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return back()->with('error', 'You do not have permission to delete employee DTRs.');
        }

        $ids = $request->input('ids', []);

        if (! is_array($ids) || $ids === []) {
            return back()->with('error', 'No DTRs selected.');
        }

        $count = Dtr::whereIn('id', $ids)->delete();

        return to_route('summary.index')->with('success', "{$count} DTR(s) deleted successfully.");
    }

    protected function resolvedPeriodDate(Dtr $dtr): Carbon
    {
        $periodSource = $dtr->entries->first()?->work_date ?? $dtr->updated_at ?? $dtr->created_at ?? now();

        return $periodSource instanceof Carbon
            ? $periodSource->copy()
            : Carbon::parse($periodSource);
    }

    protected function resolvedRegularAmount(Dtr $dtr): string
    {
        return $this->formatRate(
            $dtr->entries->sum(
                fn ($entry): float => (float) ($entry->rate ?? 0),
            ),
        );
    }

    protected function resolvedDailyRateBasis(Dtr $dtr): string
    {
        $baseRateEntry = $dtr->entries->first(
            fn ($entry): bool => (float) ($entry->base_rate ?? 0) > 0,
        );

        if ($baseRateEntry?->base_rate !== null) {
            return (string) $baseRateEntry->base_rate;
        }

        return $dtr->employee?->daily_rate !== null
            ? (string) $dtr->employee->daily_rate
            : '0.00';
    }

    protected function formatRate(float $value): string
    {
        return number_format(round($value, 2), 2, '.', '');
    }

    protected function holidayMultiplier(string $holidayType): float
    {
        return match ($holidayType) {
            'regularHoliday' => 2.0,
            'specialWorkingHoliday' => 1.3,
            default => 1.0,
        };
    }

    protected function resolvedHourlyRateForEmployee($employee): float
    {
        if ($employee?->hourly_rate !== null && (float) $employee->hourly_rate > 0) {
            return (float) $employee->hourly_rate;
        }

        $dailyRate = $this->resolvedDailyRateForEmployee($employee);

        return $dailyRate > 0 ? $dailyRate / 8 : 0;
    }

    protected function resolvedDailyRateForEmployee($employee): float
    {
        if ($employee?->daily_rate !== null && (float) $employee->daily_rate > 0) {
            return (float) $employee->daily_rate;
        }

        if ($employee?->monthly_rate !== null && (float) $employee->monthly_rate > 0) {
            return (float) $employee->monthly_rate / 26;
        }

        return 0;
    }

    protected function storedSchedule($employee): array
    {
        $storedSchedule = is_array($employee->weekly_schedule) ? $employee->weekly_schedule : [];

        if ($storedSchedule !== []) {
            return collect($storedSchedule)
                ->filter(fn (mixed $scheduleDay): bool => is_array($scheduleDay) && array_key_exists('day', $scheduleDay))
                ->map(fn (array $scheduleDay): array => [
                    'day' => (int) $scheduleDay['day'],
                    'startTime' => $this->formatScheduleTime($scheduleDay['start_time'] ?? $employee->scheduled_start_time),
                    'endTime' => $this->formatScheduleTime($scheduleDay['end_time'] ?? $employee->scheduled_end_time),
                ])
                ->sortBy('day')
                ->values()
                ->all();
        }

        return collect($employee->work_days ?? [])
            ->map(fn (mixed $day): array => [
                'day' => (int) $day,
                'startTime' => $this->formatScheduleTime($employee->scheduled_start_time),
                'endTime' => $this->formatScheduleTime($employee->scheduled_end_time),
            ])
            ->sortBy('day')
            ->values()
            ->all();
    }

    protected function formatScheduleTime(mixed $time): string
    {
        $value = is_string($time) ? $time : '';

        if ($value === '') {
            return '';
        }

        return strlen($value) >= 5 ? substr($value, 0, 5) : $value;
    }

    protected function resolveWorkedMinutesFromSchedule(?string $startTime, ?string $endTime): int
    {
        if ($startTime === null || $startTime === '' || $endTime === null || $endTime === '') {
            return 0;
        }

        $startMinutes = $this->minutesFromTimeString($startTime);
        $endMinutes = $this->minutesFromTimeString($endTime);

        if ($startMinutes === null || $endMinutes === null) {
            return 0;
        }

        $totalMinutes = $endMinutes - $startMinutes;

        if ($totalMinutes <= 0) {
            return 0;
        }

        $breakMinutes = 60;

        return max(0, $totalMinutes - $breakMinutes);
    }

    protected function minutesFromTimeString(?string $time): ?int
    {
        if (! is_string($time) || $time === '' || strlen($time) < 5) {
            return null;
        }

        $parts = explode(':', substr($time, 0, 5));

        if (count($parts) !== 2) {
            return null;
        }

        $hours = (int) $parts[0];
        $minutes = (int) $parts[1];

        if ($hours < 0 || $hours > 23 || $minutes < 0 || $minutes > 59) {
            return null;
        }

        return $hours * 60 + $minutes;
    }
}
