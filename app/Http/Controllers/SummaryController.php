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
            'successMessage' => session('success'),
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
                        fn ($entry): float => (float) ($entry->base_rate ?? 0) * max(0, $this->holidayMultiplier((string) $entry->holiday_type) - 1),
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

        $filename = sprintf(
            'dtr-%s-%s-%s.pdf',
            preg_replace('/[^a-z0-9]+/', '-', strtolower($employeeName)),
            $year,
            str_pad((string) $month, 2, '0', STR_PAD_LEFT),
        );

        $pdf = Pdf::loadView('pdf.dtr-summary', [
            'employeeName' => $employeeName,
            'monthLabel' => $monthLabel,
            'year' => $year,
            'totalDays' => $dtr->total_days,
            'totalWorkedMinutes' => $dtr->total_worked_minutes,
            'regularAmount' => $regularAmount,
            'dailyRateBasis' => $dailyRateBasis,
            'confirmedAt' => ($dtr->updated_at ?? $dtr->created_at)?->toISOString(),
            'totalOvertimeMinutes' => (int) $dtr->total_overtime_minutes,
            'totalOvertimeAmount' => $dtr->total_overtime_amount !== null ? (string) $dtr->total_overtime_amount : '0.00',
            'sssDeduction' => $dtr->sss_deduction !== null ? (string) $dtr->sss_deduction : '0.00',
            'pagibigDeduction' => $dtr->pagibig_deduction !== null ? (string) $dtr->pagibig_deduction : '0.00',
            'totalAmount' => $dtr->total_amount !== null ? (string) $dtr->total_amount : '0.00',
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

        $pdf = Pdf::loadView('pdf.dtr-summary-batch', [
            'dtrs' => $dtrs->map(function (Dtr $dtr): array {
                $periodDate = $this->resolvedPeriodDate($dtr);
                $employeeName = $dtr->employee?->first_name !== null
                    ? collect([$dtr->employee?->first_name, $dtr->employee?->middle_name, $dtr->employee?->last_name])->filter()->implode(' ')
                    : 'Unknown employee';

                return [
                    'employeeName' => $employeeName,
                    'monthLabel' => $periodDate->format('F'),
                    'year' => (int) $periodDate->year,
                    'totalDays' => $dtr->total_days,
                    'totalWorkedMinutes' => $dtr->total_worked_minutes,
                    'regularAmount' => $this->resolvedRegularAmount($dtr),
                    'dailyRateBasis' => $this->resolvedDailyRateBasis($dtr),
                    'confirmedAt' => ($dtr->updated_at ?? $dtr->created_at)?->toISOString(),
                    'totalOvertimeMinutes' => (int) $dtr->total_overtime_minutes,
                    'totalOvertimeAmount' => $dtr->total_overtime_amount !== null ? (string) $dtr->total_overtime_amount : '0.00',
                    'sssDeduction' => $dtr->sss_deduction !== null ? (string) $dtr->sss_deduction : '0.00',
                    'pagibigDeduction' => $dtr->pagibig_deduction !== null ? (string) $dtr->pagibig_deduction : '0.00',
                    'totalAmount' => $dtr->total_amount !== null ? (string) $dtr->total_amount : '0.00',
                    'entries' => $dtr->entries->map(fn ($entry): array => [
                        'label' => Carbon::parse($entry->work_date)->format('M j'),
                        'weekday' => Carbon::parse($entry->work_date)->format('l'),
                        'timeIn' => $entry->time_in !== null ? substr($entry->time_in, 0, 5) : '',
                        'timeOut' => $entry->time_out !== null ? substr($entry->time_out, 0, 5) : '',
                        'holidayType' => (string) $entry->holiday_type,
                        'workedMinutes' => (int) $entry->worked_minutes,
                        'rate' => $entry->rate !== null ? (string) $entry->rate : '',
                    ])->values()->all(),
                ];
            })->values()->all(),
        ])->setPaper('a4', 'portrait');

        $filename = 'dtr-batch-export-'.now()->format('Y-m-d-His').'.pdf';

        $this->auditLogger->logWithoutModel('export-dtr-pdf-batch', [
            'count' => $dtrs->count(),
            'dtr_ids' => $ids,
        ]);

        return new HttpResponse($pdf->stream($filename), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
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
}
