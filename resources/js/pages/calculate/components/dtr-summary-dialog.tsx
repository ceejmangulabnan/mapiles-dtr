import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    PAGIBIG_FIXED_RATE,
    SSS_BASE_SALARY,
    SSS_BASE_CONTRIBUTION,
    SSS_INCREMENT_STEP,
    SSS_INCREMENT_AMOUNT,
    SSS_MAX_SALARY,
    SSS_MAX_CONTRIBUTION,
    formatRateAmount,
    getAttendanceCalendarRangeLabel,
    pagibigContribution,
    sssContribution
    
} from '../helpers/calculate-page';
import type {AttendanceCalendarRange} from '../helpers/calculate-page';
import type { DtrSummary } from '../hooks/use-calculate-attendance';

type DtrSummaryDialogProps = {
    open: boolean;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    summary: DtrSummary;
    sssOverride: string;
    onSssOverrideChange: (value: string) => void;
    pagibigOverride: string;
    onPagibigOverrideChange: (value: string) => void;
    monthlyRate: string;
    calendarRange: AttendanceCalendarRange;
};

export default function DtrSummaryDialog({
    open,
    isSubmitting,
    onOpenChange,
    onConfirm,
    summary,
    sssOverride,
    onSssOverrideChange,
    pagibigOverride,
    onPagibigOverrideChange,
    monthlyRate,
    calendarRange,
}: DtrSummaryDialogProps) {
    const hasOvertime = summary.overtime.totalMinutes > 0;
    const hasMonthlyRate = monthlyRate.trim() !== '' && Number.isFinite(Number(monthlyRate));

    function pagibigFormulaBreakdown(): string {
        const isSemiMonthly = calendarRange !== 'wholeMonth';
        const rangeLabel = isSemiMonthly
            ? getAttendanceCalendarRangeLabel(calendarRange)
            : '';
        const total = pagibigContribution();

        if (isSemiMonthly) {
            return `Fixed rate of ${formatRateAmount(total)} per month. Divided by 2 for ${rangeLabel} period: ${formatRateAmount(summary.pagibigContribution)}.`;
        }

        return `Fixed rate of ${formatRateAmount(total)} per month.`;
    }

    function sssFormulaBreakdown(): string {
        const salary = Number(monthlyRate);

        if (!Number.isFinite(salary) || salary === 0) {
            return 'No monthly rate set for this employee.';
        }

        const isSemiMonthly = calendarRange !== 'wholeMonth';
        const rangeLabel = isSemiMonthly
            ? getAttendanceCalendarRangeLabel(calendarRange)
            : '';

        let formula: string;

        if (salary < SSS_BASE_SALARY) {
            formula = `Monthly Rate: ${formatRateAmount(salary)}. Below ₱${SSS_BASE_SALARY.toLocaleString()}, flat rate of ${formatRateAmount(SSS_BASE_CONTRIBUTION)}.`;
        } else if (salary >= SSS_MAX_SALARY) {
            formula = `Monthly Rate: ${formatRateAmount(salary)}. At or above ₱${SSS_MAX_SALARY.toLocaleString()}, contribution is capped at ${formatRateAmount(SSS_MAX_CONTRIBUTION)}.`;
        } else {
            const excess = Math.max(0, salary - SSS_BASE_SALARY);
            const steps = Math.floor(excess / SSS_INCREMENT_STEP);
            const total = sssContribution(monthlyRate);
            formula = `Monthly Rate: ${formatRateAmount(salary)}. Base: ${formatRateAmount(SSS_BASE_CONTRIBUTION)} + ${steps + 1} step${steps + 1 > 1 ? 's' : ''} × ${formatRateAmount(SSS_INCREMENT_AMOUNT)} = ${formatRateAmount(total)}.`;
        }

        if (isSemiMonthly) {
            return `${formula} Divided by 2 for ${rangeLabel} period: ${formatRateAmount(summary.sssContribution)}.`;
        }

        return formula;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>DTR Summary</DialogTitle>
                    <DialogDescription>
                        Review the daily entries and overtime computation below
                        before confirming this DTR.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Employee
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                            {summary.employeeName}
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Period</p>
                        <p className="mt-1 font-medium text-foreground">
                            {summary.periodLabel}
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Workdays
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                            {summary.totalDays}
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Total hours
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                            {summary.totalWorkedDuration}
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Regular pay
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                            {summary.regularAmountLabel}
                        </p>
                    </div>
                    {summary.holidayPremium > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                            <p className="text-sm text-muted-foreground">
                                Holiday salary increase
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                                {summary.holidayPremiumLabel}
                            </p>
                        </div>
                    )}
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Total pay (gross)
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                            {summary.totalAmountLabel}
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border bg-muted/10 p-4">
                    <p className="text-sm font-semibold text-foreground">
                        SSS deduction
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">
                                Monthly rate
                            </p>
                            <p className="mt-0.5 font-medium text-foreground">
                                {hasMonthlyRate
                                    ? formatRateAmount(monthlyRate)
                                    : '--'}
                            </p>
                        </div>

                        <div className="rounded-lg border bg-background p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Auto-computed SSS
                                </p>
                                {hasMonthlyRate && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 shrink-0"
                                            >
                                                <Info className="h-3 w-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="bottom"
                                            align="start"
                                            className="max-w-xs text-xs"
                                        >
                                            {sssFormulaBreakdown()}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                            <p className="mt-0.5 font-medium text-foreground">
                                {hasMonthlyRate
                                    ? formatRateAmount(summary.sssContribution)
                                    : '--'}
                            </p>
                        </div>

                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">
                                Override (optional)
                            </p>
                            <div className="mt-0.5">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={sssOverride}
                                    onChange={(e) => {
                                        const val = e.target.value;

                                        if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
                                            onSssOverrideChange(val);
                                        }
                                    }}
                                    className="h-8 w-full max-w-36 text-sm"
                                    placeholder={
                                        hasMonthlyRate
                                            ? `Auto: ${summary.sssDeductionLabel}`
                                            : '0.00'
                                    }
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">
                                Effective deduction
                            </p>
                            <p className="mt-0.5 font-semibold text-foreground">
                                {summary.sssDeductionLabel}
                            </p>
                            {sssOverride.trim() !== '' && (
                                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                                    Auto: {formatRateAmount(summary.sssContribution)}
                                    {Number(sssOverride) > summary.sssContribution
                                        ? ' (higher)'
                                        : Number(sssOverride) < summary.sssContribution && Number(sssOverride) >= 0
                                            ? ' (lower)'
                                            : ''}
                                </p>
                            )}
                        </div>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-foreground">
                        Pag-IBIG deduction
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">
                                Monthly rate
                            </p>
                            <p className="mt-0.5 font-medium text-foreground">
                                {formatRateAmount(PAGIBIG_FIXED_RATE)}
                            </p>
                        </div>

                        <div className="rounded-lg border bg-background p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Auto-computed Pag-IBIG
                                </p>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 shrink-0"
                                        >
                                            <Info className="h-3 w-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="bottom"
                                        align="start"
                                        className="max-w-xs text-xs"
                                    >
                                        {pagibigFormulaBreakdown()}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="mt-0.5 font-medium text-foreground">
                                {formatRateAmount(summary.pagibigContribution)}
                            </p>
                        </div>

                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">
                                Override (optional)
                            </p>
                            <div className="mt-0.5">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={pagibigOverride}
                                    onChange={(e) => {
                                        const val = e.target.value;

                                        if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
                                            onPagibigOverrideChange(val);
                                        }
                                    }}
                                    className="h-8 w-full max-w-36 text-sm"
                                    placeholder={`Auto: ${summary.pagibigDeductionLabel}`}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">
                                Effective deduction
                            </p>
                            <p className="mt-0.5 font-semibold text-foreground">
                                {summary.pagibigDeductionLabel}
                            </p>
                            {pagibigOverride.trim() !== '' && (
                                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                                    Auto: {formatRateAmount(summary.pagibigContribution)}
                                    {Number(pagibigOverride) > summary.pagibigContribution
                                        ? ' (higher)'
                                        : Number(pagibigOverride) < summary.pagibigContribution && Number(pagibigOverride) >= 0
                                            ? ' (lower)'
                                            : ''}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 rounded-lg border bg-primary/5 p-3">
                        <div className="flex items-baseline justify-between gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Net pay
                                </p>
                                <p className="mt-0.5 text-lg font-bold text-foreground">
                                    {summary.netPayLabel}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {summary.totalAmountLabel} − {summary.sssDeductionLabel} SSS − {summary.pagibigDeductionLabel} Pag-IBIG
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border bg-muted/10 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="font-medium text-foreground">
                                Overtime computation
                            </p>
                        </div>
                    </div>

                    {hasOvertime ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-lg border bg-background p-4">
                                <p className="text-sm text-muted-foreground">
                                    Overtime hours
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {summary.overtime.totalHoursLabel}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-background p-4">
                                <p className="text-sm text-muted-foreground">
                                    Hourly rate basis
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {summary.overtime.rateBasisLabel}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-background p-4">
                                <p className="text-sm text-muted-foreground">
                                    Base overtime
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {summary.overtime.baseAmountLabel}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-background p-4">
                                <p className="text-sm text-muted-foreground">
                                    {summary.overtime.premiumRateLabel} premium
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {summary.overtime.premiumAmountLabel}
                                </p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">
                                    Overtime pay
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {summary.overtime.totalAmountLabel}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                            {summary.overtime.formulaLabel}
                        </div>
                    )}
                </div>

                <div className="hidden md:block">
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/30 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Date
                                    </th>
                                    <th className="px-3 py-3 font-medium">
                                        Time in
                                    </th>
                                    <th className="px-3 py-3 font-medium">
                                        Time out
                                    </th>
                                    <th className="px-3 py-3 font-medium">
                                        Holiday
                                    </th>
                                    <th className="px-3 py-3 font-medium">
                                        Hours
                                    </th>
                                    <th className="px-3 py-3 font-medium">
                                        Rate
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.entries.map((entry) => (
                                    <tr
                                        key={entry.key}
                                        className="border-b align-top last:border-b-0 odd:bg-muted/10"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-foreground">
                                                {entry.label}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {entry.weekday}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            {entry.timeIn || '--'}
                                        </td>
                                        <td className="px-3 py-3">
                                            {entry.timeOut || '--'}
                                        </td>
                                        <td className="px-3 py-3">
                                            {entry.holidayLabel}
                                        </td>
                                        <td className="px-3 py-3 font-medium">
                                            {entry.workedDuration}
                                        </td>
                                        <td className="px-3 py-3">
                                            {entry.rateLabel}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-3 md:hidden">
                    {summary.entries.map((entry) => (
                        <div key={entry.key} className="rounded-lg border p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-medium text-foreground">
                                        {entry.label}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {entry.weekday}
                                    </p>
                                </div>
                                <div className="rounded-full border bg-muted/30 px-3 py-1 text-sm font-medium text-foreground">
                                    {entry.workedDuration}
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground">
                                        Time in
                                    </p>
                                    <p className="font-medium text-foreground">
                                        {entry.timeIn || '--'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Time out
                                    </p>
                                    <p className="font-medium text-foreground">
                                        {entry.timeOut || '--'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Holiday
                                    </p>
                                    <p className="font-medium text-foreground">
                                        {entry.holidayLabel}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Rate
                                    </p>
                                    <p className="font-medium text-foreground">
                                        {entry.rateLabel}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="gap-2 border-t pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Back to editing
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : 'Confirm DTR'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
