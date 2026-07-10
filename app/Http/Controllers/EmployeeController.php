<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    private const FIXED_GRACE_PERIOD_MINUTES = 5;

    private const WORK_DAYS_PER_MONTH = 26;

    private const WORK_HOURS_PER_DAY = 8;

    public function index(): Response
    {
        return Inertia::render('employees/index', $this->pageProps());
    }

    public function store(StoreEmployeeRequest $request): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return back()->with('error', 'You do not have permission to create employees.');
        }

        $employee = new Employee;
        $employee->created_by = $request->user()->id;
        $employee->updated_by = $request->user()->id;
        $this->saveEmployee($employee, $request->validated());

        return to_route('employees.index')->with('success', 'Employee added successfully.');
    }

    public function update(StoreEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return back()->with('error', 'You do not have permission to update employees.');
        }

        $employee->updated_by = $request->user()->id;
        $this->saveEmployee($employee, $request->validated());

        return to_route('employees.index')->with('success', 'Employee updated successfully.');
    }

    public function destroy(Request $request, Employee $employee): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return back()->with('error', 'You do not have permission to delete employees.');
        }

        $employee->delete();

        return to_route('employees.index')->with('success', 'Employee deleted successfully.');
    }

    public function batchDestroy(Request $request): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            return back()->with('error', 'You do not have permission to delete employees.');
        }

        $ids = $request->input('ids', []);

        if (! is_array($ids) || $ids === []) {
            return back()->with('error', 'No employees selected.');
        }

        $count = Employee::whereIn('id', $ids)->delete();

        return to_route('employees.index')->with('success', "{$count} employee(s) deleted successfully.");
    }

    public function updateStatus(UpdateUserStatusRequest $request, Employee $employee): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            abort(403, 'Unauthorized action.');
        }

        $employee->update([
            'status' => $request->input('status'),
        ]);

        return to_route('employees.index')->with('success', 'Employee status updated successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function pageProps(): array
    {
        $employeeRecords = Employee::query()
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $allScheduleDays = $employeeRecords->flatMap(fn (Employee $employee) => $this->storedWeeklySchedule($employee));
        $averageWorkDays = (int) round(
            $employeeRecords->map(fn (Employee $employee) => count($this->storedWeeklySchedule($employee)))->avg() ?? 0,
        );

        $employees = $employeeRecords->map(function (Employee $employee): array {
            $scheduleGroups = collect($this->groupedWeeklySchedule($employee))
                ->map(fn (array $group) => [
                    'days' => $group['days'],
                    'startTime' => $group['start_time'],
                    'endTime' => $group['end_time'],
                ])
                ->values()
                ->all();
            $monthlyRate = $this->resolvedMonthlyRate($employee);
            $dailyRate = $monthlyRate !== ''
                ? $this->calculateDailyRate($monthlyRate)
                : ($employee->daily_rate !== null ? (string) $employee->daily_rate : '');
            $hourlyRate = $dailyRate !== ''
                ? $this->calculateHourlyRate($dailyRate)
                : ($employee->hourly_rate !== null ? (string) $employee->hourly_rate : '');

            return [
                'id' => $employee->id,
                'status' => $employee->status?->value ?? 'active',
                'firstName' => (string) $employee->first_name,
                'middleName' => $employee->middle_name,
                'lastName' => (string) $employee->last_name,
                'fullName' => collect([
                    $employee->first_name,
                    $employee->middle_name,
                    $employee->last_name,
                ])->filter()->implode(' '),
                'monthlyRate' => $monthlyRate,
                'dailyRate' => $dailyRate,
                'hourlyRate' => $hourlyRate,
                'schedule' => [
                    'groups' => $scheduleGroups,
                ],
            ];
        });

        return [
            'employees' => $employees,
            'summary' => [
                'totalEmployees' => $employeeRecords->count(),
                'averageWorkDays' => $averageWorkDays,
                'averageGraceMinutes' => (int) round($allScheduleDays->avg('grace_period_minutes') ?? 0),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    protected function saveEmployee(Employee $employee, array $validated): void
    {
        $weeklySchedule = $this->expandScheduleGroups($validated['schedule_groups']);
        $primarySchedule = $weeklySchedule[0];
        $monthlyRate = $this->formatRate((float) $validated['monthly_rate']);
        $dailyRate = $this->calculateDailyRate($monthlyRate);
        $hourlyRate = $this->calculateHourlyRate($dailyRate);

        $employee->fill([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'],
            'last_name' => $validated['last_name'],
            'monthly_rate' => $monthlyRate,
            'hourly_rate' => $hourlyRate,
            'daily_rate' => $dailyRate,
            'employment_end_date' => $validated['employment_end_date'] ?? null,
            'scheduled_start_time' => $primarySchedule['start_time'],
            'scheduled_end_time' => $primarySchedule['end_time'],
            'grace_period_minutes' => self::FIXED_GRACE_PERIOD_MINUTES,
            'work_days' => array_column($weeklySchedule, 'day'),
            'weekly_schedule' => $weeklySchedule,
        ]);

        $employee->save();
    }

    protected function resolvedMonthlyRate(Employee $employee): string
    {
        if ($employee->monthly_rate !== null) {
            return (string) $employee->monthly_rate;
        }

        if ($employee->daily_rate !== null) {
            return $this->formatRate((float) $employee->daily_rate * self::WORK_DAYS_PER_MONTH);
        }

        if ($employee->hourly_rate !== null) {
            return $this->formatRate((float) $employee->hourly_rate * self::WORK_HOURS_PER_DAY * self::WORK_DAYS_PER_MONTH);
        }

        return '';
    }

    protected function calculateDailyRate(string $monthlyRate): string
    {
        if ($monthlyRate === '') {
            return '';
        }

        return $this->formatRate((float) $monthlyRate / self::WORK_DAYS_PER_MONTH);
    }

    protected function calculateHourlyRate(string $dailyRate): string
    {
        if ($dailyRate === '') {
            return '';
        }

        return $this->formatRate((float) $dailyRate / self::WORK_HOURS_PER_DAY);
    }

    protected function formatRate(float $value): string
    {
        return number_format(round($value, 2), 2, '.', '');
    }

    /**
     * @param  array<int, array<string, mixed>>  $scheduleGroups
     * @return array<int, array<string, int|string>>
     */
    protected function expandScheduleGroups(array $scheduleGroups): array
    {
        return collect($scheduleGroups)
            ->flatMap(function (array $scheduleGroup): array {
                $days = collect($scheduleGroup['days'] ?? [])
                    ->map(fn (mixed $day) => (int) $day)
                    ->unique()
                    ->sort()
                    ->values()
                    ->all();

                return array_map(fn (int $day): array => [
                    'day' => $day,
                    'start_time' => $this->normalizeTime((string) $scheduleGroup['start_time']),
                    'end_time' => $this->normalizeTime((string) $scheduleGroup['end_time']),
                    'grace_period_minutes' => self::FIXED_GRACE_PERIOD_MINUTES,
                ], $days);
            })
            ->sortBy('day')
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, int|array<int>|string>>
     */
    protected function groupedWeeklySchedule(Employee $employee): array
    {
        return collect($this->storedWeeklySchedule($employee))
            ->groupBy(fn (array $scheduleDay) => implode('|', [
                $scheduleDay['start_time'],
                $scheduleDay['end_time'],
            ]))
            ->map(function ($scheduleDays): array {
                $firstDay = $scheduleDays->first();

                return [
                    'days' => $scheduleDays->pluck('day')->map(fn ($day) => (int) $day)->sort()->values()->all(),
                    'start_time' => $firstDay['start_time'],
                    'end_time' => $firstDay['end_time'],
                ];
            })
            ->sortBy(fn (array $group) => $group['days'][0] ?? 7)
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    protected function storedWeeklySchedule(Employee $employee): array
    {
        $storedSchedule = is_array($employee->weekly_schedule) ? $employee->weekly_schedule : [];

        if ($storedSchedule !== []) {
            return collect($storedSchedule)
                ->filter(fn (array $daySchedule) => array_key_exists('day', $daySchedule))
                ->map(fn (array $daySchedule) => [
                    'day' => (int) $daySchedule['day'],
                    'start_time' => (string) ($daySchedule['start_time'] ?? $employee->scheduled_start_time),
                    'end_time' => (string) ($daySchedule['end_time'] ?? $employee->scheduled_end_time),
                    'grace_period_minutes' => self::FIXED_GRACE_PERIOD_MINUTES,
                ])
                ->sortBy('day')
                ->values()
                ->all();
        }

        return collect($employee->work_days ?? [])
            ->map(fn (int $day) => [
                'day' => $day,
                'start_time' => (string) $employee->scheduled_start_time,
                'end_time' => (string) $employee->scheduled_end_time,
                'grace_period_minutes' => self::FIXED_GRACE_PERIOD_MINUTES,
            ])
            ->sortBy('day')
            ->values()
            ->all();
    }

    protected function normalizeTime(string $time): string
    {
        return strlen($time) === 5 ? $time.':00' : $time;
    }
}
