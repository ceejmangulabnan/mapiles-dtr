import { router } from '@inertiajs/react';
import { useState } from 'react';
import { store as calculateStore } from '@/routes/calculate';
import { index as summaryIndex } from '@/routes/summary';
import {
    buildMonthDays,
    buildOvertimeSummary,
    createAttendanceEntry,
    daysPerPage,
    filterMonthDaysByAttendanceCalendarRange,
    formatRateAmount,
    formatWorkedDuration,
    getAdjustedDailyRate,
    getAttendanceCalendarPeriodLabel,
    getAttendanceEntryKey,
    getBaseDailyRate,
    getComputedDailyRate,
    getHolidayLabel,
    getHolidayMultiplier,
    getHolidayPremium,
    getLateMinutes,
    getLunchBreakMinutes,
    getOvertimeMinutes,
    getShiftDurationMinutes,
    getWorkedMinutes,
    isHalfDayTimeIn,
    isHalfDayEarlyOut,
    monthOptions,
    pagibigContribution,
    sssContribution,
    SSS_BASE_SALARY,
    SSS_BASE_CONTRIBUTION,
    SSS_INCREMENT_STEP,
    SSS_INCREMENT_AMOUNT
    
    
    
    
    
    
    
    
    
} from '../helpers/calculate-page';
import type {ActiveDtr, AttendanceCalendarRange, AttendanceEntry, AttendanceField, EmployeeOption, HolidayType, InitialSelection, MonthDay, OvertimeSummaryBreakdown} from '../helpers/calculate-page';

const absentRate = '0.00';

export type DtrSummaryEntry = {
    key: string;
    label: string;
    weekday: string;
    timeIn: string;
    timeOut: string;
    holidayLabel: string;
    workedDuration: string;
    rateLabel: string;
    isAbsent: boolean;
};

export type DtrSummary = {
    employeeName: string;
    monthLabel: string;
    year: string;
    periodLabel: string;
    totalDays: number;
    totalWorkedDuration: string;
    regularAmountLabel: string;
    regularAmount: number;
    holidayPremium: number;
    holidayPremiumLabel: string;
    overtime: OvertimeSummaryBreakdown;
    sssContribution: number;
    sssDeductionLabel: string;
    sssDeduction: number;
    pagibigContribution: number;
    pagibigDeductionLabel: string;
    pagibigDeduction: number;
    netPay: number;
    netPayLabel: string;
    totalAmountLabel: string;
    entries: DtrSummaryEntry[];
};

export type RateComputationDetails = {
    key: string;
    label: string;
    weekday: string;
    timeIn: string;
    timeOut: string;
    scheduledTimeInLabel: string;
    gracePeriodLabel: string;
    attendanceStatusLabel: string;
    lateMinutesLabel: string;
    lateDeductionLabel: string;
    shiftDurationLabel: string;
    breakDurationLabel: string;
    workedDurationLabel: string;
    timeFormulaLabel: string;
    holidayLabel: string;
    holidayAdjustmentLabel: string;
    multiplierLabel: string;
    baseRateLabel: string;
    rateLabel: string;
    rateFormulaLabel: string;
    isAbsent: boolean;
};

function buildInitialAttendanceEntries(
    activeDtr: ActiveDtr | null | undefined,
) {
    if (!activeDtr) {
        return {} as Record<string, AttendanceEntry>;
    }

    return Object.fromEntries(
        activeDtr.entries.map((entry) => [
            getAttendanceEntryKey(activeDtr.employeeId.toString(), entry.date),
            {
                timeIn: entry.timeIn,
                timeOut: entry.timeOut,
                baseRate:
                    entry.baseRate ||
                    getBaseDailyRate(entry.rate, entry.holidayType),
                rate: entry.rate,
                holidayType: entry.holidayType,
                isAbsent: entry.isAbsent,
            },
        ]),
    );
}

function initialSssOverride(activeDtr: ActiveDtr | null | undefined): string {
    if (!activeDtr || !activeDtr.sssDeduction) {
        return '';
    }

    return activeDtr.sssDeduction;
}

function initialPagibigOverride(
    activeDtr: ActiveDtr | null | undefined,
): string {
    if (!activeDtr || !activeDtr.pagibigDeduction) {
        return '';
    }

    return activeDtr.pagibigDeduction;
}

function getHolidayAdjustmentLabel(holidayType: HolidayType): string {
    switch (holidayType) {
        case 'regularHoliday':
            return 'Adds 100% of the base rate.';
        case 'specialWorkingHoliday':
            return 'Adds 30% of the base rate.';
        case 'none':
        default:
            return 'No holiday premium applied.';
    }
}

function formatMinuteCount(value: number): string {
    return `${value} minute${value === 1 ? '' : 's'}`;
}

function formatGracePeriod(value: number): string {
    return `${formatMinuteCount(value)} grace`;
}

function hasMeaningfulAttendanceValues(entry: AttendanceEntry): boolean {
    return (
        entry.timeIn.trim() !== '' ||
        entry.timeOut.trim() !== '' ||
        entry.holidayType !== 'none' ||
        (entry.baseRate.trim() !== '' && entry.baseRate !== absentRate) ||
        (entry.rate.trim() !== '' && entry.rate !== absentRate)
    );
}

export function useCalculateAttendance(
    employees: EmployeeOption[],
    initialSelection: InitialSelection | null | undefined,
    activeDtr: ActiveDtr | null | undefined,
    isEditingFromSummary = false,
) {
    const today = new Date();
    const currentYear = initialSelection?.year ?? today.getFullYear();
    const currentMonth = initialSelection?.month ?? today.getMonth() + 1;
    const yearOptions = Array.from(
        { length: 7 },
        (_, index) => currentYear - 3 + index,
    );
    const initialEmployeeId =
        initialSelection?.employeeId?.toString() ??
        employees[0]?.id.toString() ??
        '';

    const [selectedEmployeeId, setSelectedEmployeeId] =
        useState(initialEmployeeId);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedCalendarRange, setSelectedCalendarRange] =
        useState<AttendanceCalendarRange>(
            initialSelection?.calendarRange ?? 'wholeMonth',
        );
    const [currentPage, setCurrentPage] = useState(1);
    const [attendanceEntries, setAttendanceEntries] = useState<
        Record<string, AttendanceEntry>
    >(() => buildInitialAttendanceEntries(activeDtr));
    const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
    const [isSubmittingDtr, setIsSubmittingDtr] = useState(false);
    const [selectedComputationDayKey, setSelectedComputationDayKey] = useState<
        string | null
    >(null);
    const [manualSssOverride, setManualSssOverride] = useState<string>(() =>
        initialSssOverride(activeDtr),
    );
    const [manualPagibigOverride, setManualPagibigOverride] = useState<string>(
        () => initialPagibigOverride(activeDtr),
    );

    const selectedEmployee =
        employees.find(
            (employee) => employee.id.toString() === selectedEmployeeId,
        ) ?? null;

    const allMonthDays = selectedEmployee
        ? buildMonthDays(
              Number(selectedYear),
              Number(selectedMonth),
              selectedEmployee.schedule,
          )
        : [];
    const monthDays = filterMonthDaysByAttendanceCalendarRange(
        allMonthDays,
        Number(selectedYear),
        Number(selectedMonth),
        selectedCalendarRange,
    );
    const totalPages = Math.max(1, Math.ceil(monthDays.length / daysPerPage));
    const visiblePage = Math.min(currentPage, totalPages);
    const startIndex = (visiblePage - 1) * daysPerPage;
    const paginatedDays = monthDays.slice(startIndex, startIndex + daysPerPage);
    const pageNumbers = Array.from(
        { length: totalPages },
        (_, index) => index + 1,
    );
    const selectedMonthLabel =
        monthOptions.find((month) => month.value.toString() === selectedMonth)
            ?.label ?? 'Selected month';
    const selectedPeriodLabel = getAttendanceCalendarPeriodLabel(
        Number(selectedYear),
        Number(selectedMonth),
        selectedCalendarRange,
    );

    const getScheduledDay = (dateKey: string) =>
        allMonthDays.find((day) => day.key === dateKey) ?? null;

    const getDefaultAttendanceEntry = (dateKey: string) => {
        const scheduledDay = getScheduledDay(dateKey);

        return createAttendanceEntry({
            dailyRate: selectedEmployee?.dailyRate ?? '',
            timeIn: scheduledDay?.defaultTimeIn ?? '',
            timeOut: scheduledDay?.defaultTimeOut ?? '',
        });
    };

    const getStoredAttendanceEntry = (dateKey: string) => {
        const entryKey = getAttendanceEntryKey(selectedEmployeeId, dateKey);

        return (
            attendanceEntries[entryKey] ?? getDefaultAttendanceEntry(dateKey)
        );
    };

    const getAttendanceEntry = (dateKey: string) => {
        const entry = getStoredAttendanceEntry(dateKey);
        const scheduledDay = getScheduledDay(dateKey);

        if (!scheduledDay) {
            return entry;
        }

        if (entry.isAbsent && entry.holidayType !== 'regularHoliday') {
            return {
                ...entry,
                baseRate: absentRate,
                rate: absentRate,
            };
        }

        if (entry.isAbsent) {
            return {
                ...entry,
            };
        }

        return {
            ...entry,
            rate: getComputedDailyRate(
                entry.baseRate,
                entry.holidayType,
                entry.timeIn,
                scheduledDay.defaultTimeIn,
                scheduledDay.graceMinutes,
                entry.timeOut,
            ),
        };
    };

    const getAttendanceStatusLabel = (
        day: MonthDay,
        entry: AttendanceEntry,
    ): string => {
        if (entry.isAbsent) {
            return 'Absent';
        }

        if (entry.timeIn.trim() === '') {
            return 'Waiting for time in';
        }

        if (day.defaultTimeIn.trim() === '') {
            return 'No scheduled start';
        }

        if (isHalfDayTimeIn(entry.timeIn, day.defaultTimeIn)) {
            return 'Half day';
        }

        if (isHalfDayEarlyOut(entry.timeIn, entry.timeOut)) {
            return 'Half day (Early Out)';
        }

        const lateMinutes = getLateMinutes(
            entry.timeIn,
            day.defaultTimeIn,
            day.graceMinutes,
        );

        if (lateMinutes === null) {
            return 'Enter a valid time in';
        }

        return lateMinutes > 0 ? 'Late' : 'On time';
    };

    const summaryEntryData = monthDays.map((day) => {
        const entry = getAttendanceEntry(day.key);
        const effectiveTimeIn = entry.isAbsent ? '' : entry.timeIn;
        const effectiveTimeOut = entry.isAbsent ? '' : entry.timeOut;
        const isAbsentOnRegularHoliday =
            entry.isAbsent && entry.holidayType === 'regularHoliday';
        const effectiveHolidayType = isAbsentOnRegularHoliday
            ? 'regularHoliday'
            : (entry.isAbsent ? 'none' : entry.holidayType);
        const effectiveBaseRate = isAbsentOnRegularHoliday
            ? entry.baseRate
            : (entry.isAbsent ? absentRate : entry.baseRate);
        const effectiveRate = isAbsentOnRegularHoliday
            ? entry.rate
            : (entry.isAbsent ? absentRate : entry.rate);
        const workedMinutes = entry.isAbsent
            ? 0
            : (getWorkedMinutes(effectiveTimeIn, effectiveTimeOut) ?? 0);
        const parsedRate = Number(effectiveRate);

        return {
            key: day.key,
            label: day.label,
            weekday: day.weekday,
            timeIn: effectiveTimeIn,
            timeOut: effectiveTimeOut,
            holidayLabel: isAbsentOnRegularHoliday
                ? getHolidayLabel('regularHoliday')
                : (entry.isAbsent
                    ? 'Absent'
                    : getHolidayLabel(effectiveHolidayType)),
            holidayType: effectiveHolidayType,
            workedDuration: formatWorkedDuration(workedMinutes),
            workedMinutes,
            overtimeMinutes: entry.isAbsent
                ? 0
                : getOvertimeMinutes(
                      workedMinutes,
                      day.defaultTimeIn,
                      day.defaultTimeOut,
                  ),
            rateAmount: Number.isFinite(parsedRate) ? parsedRate : 0,
            rate: effectiveRate,
            baseRate: effectiveBaseRate,
            isAbsent: entry.isAbsent,
            rateLabel:
                entry.isAbsent || effectiveRate.trim() !== ''
                    ? formatRateAmount(effectiveRate)
                    : '--',
        };
    });

    const totalWorkedMinutes = summaryEntryData.reduce(
        (total, entry) => total + entry.workedMinutes,
        0,
    );
    const regularAmountTotal = summaryEntryData.reduce(
        (total, entry) => total + entry.rateAmount,
        0,
    );
    const totalHolidayPremium = summaryEntryData.reduce(
        (total, entry) =>
            total + (entry.isAbsent && entry.holidayType === 'regularHoliday'
                ? 0
                : getHolidayPremium(entry.baseRate, entry.holidayType)),
        0,
    );
    const totalOvertimeMinutes = summaryEntryData.reduce(
        (total, entry) => total + entry.overtimeMinutes,
        0,
    );
    const overtimeSummary = buildOvertimeSummary(
        totalOvertimeMinutes,
        selectedEmployee?.dailyRate ?? '',
    );

    const fullMonthlySss = sssContribution(selectedEmployee?.monthlyRate ?? '');
    const autoSss =
        selectedCalendarRange !== 'wholeMonth'
            ? fullMonthlySss / 2
            : fullMonthlySss;
    const manualSss =
        manualSssOverride.trim() !== '' ? Number(manualSssOverride) : NaN;
    const sssDeduction = Number.isFinite(manualSss) ? manualSss : autoSss;

    const fullMonthlyPagibig = pagibigContribution();
    const autoPagibig =
        selectedCalendarRange !== 'wholeMonth'
            ? fullMonthlyPagibig / 2
            : fullMonthlyPagibig;
    const manualPagibig =
        manualPagibigOverride.trim() !== ''
            ? Number(manualPagibigOverride)
            : NaN;
    const pagibigDeduction = Number.isFinite(manualPagibig)
        ? manualPagibig
        : autoPagibig;

    const grossTotal = regularAmountTotal + overtimeSummary.totalAmount;
    const netPay = Math.max(0, grossTotal - sssDeduction - pagibigDeduction);

    const dtrSummary: DtrSummary = {
        employeeName: selectedEmployee?.fullName ?? '',
        monthLabel: selectedMonthLabel,
        year: selectedYear,
        periodLabel: selectedPeriodLabel,
        totalDays: summaryEntryData.length,
        totalWorkedDuration: formatWorkedDuration(totalWorkedMinutes),
        regularAmountLabel: formatRateAmount(regularAmountTotal),
        regularAmount: regularAmountTotal,
        holidayPremium: totalHolidayPremium,
        holidayPremiumLabel: formatRateAmount(totalHolidayPremium),
        overtime: overtimeSummary,
        sssContribution: autoSss,
        sssDeduction,
        sssDeductionLabel: formatRateAmount(sssDeduction),
        pagibigContribution: autoPagibig,
        pagibigDeduction,
        pagibigDeductionLabel: formatRateAmount(pagibigDeduction),
        netPay,
        netPayLabel: formatRateAmount(netPay),
        totalAmountLabel: formatRateAmount(grossTotal),
        entries: summaryEntryData.map((entry) => ({
            key: entry.key,
            label: entry.label,
            weekday: entry.weekday,
            timeIn: entry.timeIn,
            timeOut: entry.timeOut,
            holidayLabel: entry.holidayLabel,
            workedDuration: entry.workedDuration,
            rateLabel: entry.rateLabel,
            isAbsent: entry.isAbsent,
        })),
    };

    const buildRateComputationDetails = (
        day: MonthDay,
    ): RateComputationDetails => {
        const entry = getAttendanceEntry(day.key);
        const scheduledTimeInLabel = day.defaultTimeIn || '--';
        const gracePeriodLabel = formatGracePeriod(day.graceMinutes);

        if (entry.isAbsent) {
            if (entry.holidayType === 'regularHoliday') {
                return {
                    key: day.key,
                    label: day.label,
                    weekday: day.weekday,
                    timeIn: '--',
                    timeOut: '--',
                    scheduledTimeInLabel,
                    gracePeriodLabel,
                    attendanceStatusLabel: 'Absent (Regular Holiday)',
                    lateMinutesLabel: 'N/A',
                    lateDeductionLabel: 'N/A',
                    shiftDurationLabel: '--',
                    breakDurationLabel: '--',
                    workedDurationLabel: formatWorkedDuration(0),
                    timeFormulaLabel:
                        'Marked as absent. Hours worked are automatically set to 0h.',
                    holidayLabel: 'Regular Holiday',
                    holidayAdjustmentLabel:
                        'Absent on a regular holiday — employee receives their base daily rate without premium.',
                    multiplierLabel: '1.00x',
                    baseRateLabel: formatRateAmount(entry.baseRate),
                    rateLabel: formatRateAmount(entry.rate),
                    rateFormulaLabel: `${formatRateAmount(entry.baseRate)} × 1.00 = ${formatRateAmount(entry.rate)} (base rate, no premium).`,
                    isAbsent: true,
                };
            }

            return {
                key: day.key,
                label: day.label,
                weekday: day.weekday,
                timeIn: '--',
                timeOut: '--',
                scheduledTimeInLabel,
                gracePeriodLabel,
                attendanceStatusLabel: 'Absent',
                lateMinutesLabel: 'N/A',
                lateDeductionLabel: 'N/A',
                shiftDurationLabel: '--',
                breakDurationLabel: '--',
                workedDurationLabel: formatWorkedDuration(0),
                timeFormulaLabel:
                    'Marked as absent. Hours worked are automatically set to 0h.',
                holidayLabel: 'Absent',
                holidayAdjustmentLabel:
                    'Absent days do not receive any holiday adjustment.',
                multiplierLabel: 'N/A',
                baseRateLabel: formatRateAmount(absentRate),
                rateLabel: formatRateAmount(absentRate),
                rateFormulaLabel: 'Absent day rate is fixed at PHP 0.00.',
                isAbsent: true,
            };
        }

        const shiftDuration = getShiftDurationMinutes(
            entry.timeIn,
            entry.timeOut,
        );
        const workedMinutes = getWorkedMinutes(entry.timeIn, entry.timeOut);
        const multiplier = getHolidayMultiplier(entry.holidayType);
        const adjustedRate = getAdjustedDailyRate(
            entry.baseRate,
            entry.holidayType,
        );
        const lateMinutes = getLateMinutes(
            entry.timeIn,
            day.defaultTimeIn,
            day.graceMinutes,
        );
        const actualBreakMinutes = getLunchBreakMinutes(entry.timeIn, entry.timeOut);
        const isHalfDay = isHalfDayTimeIn(entry.timeIn, day.defaultTimeIn);
        const isEarlyOut = isHalfDayEarlyOut(entry.timeIn, entry.timeOut);
        const attendanceStatusLabel = getAttendanceStatusLabel(day, entry);
        const hasBaseRate =
            entry.baseRate.trim() !== '' &&
            Number.isFinite(Number(entry.baseRate));
        const hasAdjustedRate =
            adjustedRate.trim() !== '' && Number.isFinite(Number(adjustedRate));
        const hasRate =
            entry.rate.trim() !== '' && Number.isFinite(Number(entry.rate));

        let lateMinutesLabel = '--';
        let lateDeductionLabel = '--';
        let rateFormulaLabel = 'No base rate available for this employee.';

        if (hasAdjustedRate && hasRate) {
            if (isHalfDay) {
                lateMinutesLabel = 'N/A';
                lateDeductionLabel = 'N/A';
                rateFormulaLabel = `${formatRateAmount(adjustedRate)} / 2 = ${formatRateAmount(entry.rate)} because ${entry.timeIn} is 3 hours or more after the scheduled ${scheduledTimeInLabel}.`;
            } else if (lateMinutes === null) {
                rateFormulaLabel = `${formatRateAmount(adjustedRate)} before late deduction. Enter a valid time in to check lateness.`;
            } else if (isEarlyOut) {
                rateFormulaLabel = `${formatRateAmount(adjustedRate)} / 2 = ${formatRateAmount(entry.rate)} because ${entry.timeOut} is 4 hours or less the standard work hours in a day.`;
            } else {
                lateMinutesLabel = formatMinuteCount(lateMinutes);
                lateDeductionLabel = formatRateAmount(lateMinutes);
                rateFormulaLabel = `${formatRateAmount(adjustedRate)} - ${formatRateAmount(lateMinutes)} = ${formatRateAmount(entry.rate)}.`;
            }
        }

        return {
            key: day.key,
            label: day.label,
            weekday: day.weekday,
            timeIn: entry.timeIn || '--',
            timeOut: entry.timeOut || '--',
            scheduledTimeInLabel,
            gracePeriodLabel,
            attendanceStatusLabel,
            lateMinutesLabel,
            lateDeductionLabel,
            shiftDurationLabel: formatWorkedDuration(shiftDuration),
            breakDurationLabel:
                shiftDuration === null
                    ? '--'
                    : formatWorkedDuration(actualBreakMinutes),
            workedDurationLabel: formatWorkedDuration(workedMinutes),
            timeFormulaLabel:
                shiftDuration === null || workedMinutes === null
                    ? `Scheduled shift: ${scheduledTimeInLabel} to ${day.defaultTimeOut || '--'}. Enter both time in and time out to compute hours worked.`
                    : actualBreakMinutes > 0
                        ? `Scheduled shift: ${scheduledTimeInLabel} to ${day.defaultTimeOut || '--'}. ${entry.timeIn} to ${entry.timeOut} = ${formatWorkedDuration(shiftDuration)} minus ${formatWorkedDuration(actualBreakMinutes)} lunch break = ${formatWorkedDuration(workedMinutes)}.`
                        : `Scheduled shift: ${scheduledTimeInLabel} to ${day.defaultTimeOut || '--'}. ${entry.timeIn} to ${entry.timeOut} = ${formatWorkedDuration(shiftDuration)} (no lunch break deduction).`,
            holidayLabel: getHolidayLabel(entry.holidayType),
            holidayAdjustmentLabel: getHolidayAdjustmentLabel(
                entry.holidayType,
            ),
            multiplierLabel: `${multiplier.toFixed(2)}x`,
            baseRateLabel: hasBaseRate
                ? formatRateAmount(entry.baseRate)
                : '--',
            rateLabel: hasRate ? formatRateAmount(entry.rate) : '--',
            rateFormulaLabel,
            isAbsent: false,
        };
    };

    const selectedRateComputation = selectedComputationDayKey
        ? (() => {
              const selectedDay = monthDays.find(
                  (day) => day.key === selectedComputationDayKey,
              );

              return selectedDay
                  ? buildRateComputationDetails(selectedDay)
                  : null;
          })()
        : null;

    const updateAttendanceEntry = (
        dateKey: string,
        field: AttendanceField,
        value: AttendanceEntry[AttendanceField],
    ) => {
        setAttendanceEntries((currentEntries) => {
            const entryKey = getAttendanceEntryKey(selectedEmployeeId, dateKey);
            const currentEntry =
                currentEntries[entryKey] ?? getDefaultAttendanceEntry(dateKey);

            if (field === 'isAbsent') {
                const isAbsent = value === true;

                if (!isAbsent) {
                    const restoredEntry = hasMeaningfulAttendanceValues(
                        currentEntry,
                    )
                        ? {
                              ...currentEntry,
                              isAbsent: false,
                          }
                        : getDefaultAttendanceEntry(dateKey);

                    return {
                        ...currentEntries,
                        [entryKey]: restoredEntry,
                    };
                }

                return {
                    ...currentEntries,
                    [entryKey]: {
                        ...currentEntry,
                        isAbsent: true,
                    },
                };
            }

            return {
                ...currentEntries,
                [entryKey]: {
                    ...currentEntry,
                    isAbsent: false,
                    [field]: value as string,
                },
            };
        });
    };

    const resetReviewState = () => {
        setIsSummaryDialogOpen(false);
        setSelectedComputationDayKey(null);
    };

    const handleEmployeeChange = (value: string) => {
        if (isEditingFromSummary) {
            return;
        }

        setSelectedEmployeeId(value);
        setCurrentPage(1);
        setManualSssOverride('');
        setManualPagibigOverride('');
        resetReviewState();
    };

    const handleMonthChange = (value: string) => {
        setSelectedMonth(value);
        setCurrentPage(1);
        resetReviewState();
    };

    const handleYearChange = (value: string) => {
        setSelectedYear(value);
        setCurrentPage(1);
        resetReviewState();
    };

    const handleCalendarRangeChange = (value: AttendanceCalendarRange) => {
        setSelectedCalendarRange(value);
        setCurrentPage(1);
        resetReviewState();
    };

    const goToPage = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(1, page - 1));
    };

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(totalPages, page + 1));
    };

    const goBackToSummary = () => {
        router.visit(summaryIndex.url());
    };

    const openSummaryDialog = () => {
        setIsSummaryDialogOpen(true);
    };

    const handleSummaryDialogChange = (open: boolean) => {
        if (isSubmittingDtr) {
            return;
        }

        setIsSummaryDialogOpen(open);
    };

    const openRateComputation = (dateKey: string) => {
        setSelectedComputationDayKey(dateKey);
    };

    const handleRateComputationDialogChange = (open: boolean) => {
        if (!open) {
            setSelectedComputationDayKey(null);
        }
    };

    const confirmDtr = () => {
        if (!selectedEmployee) {
            return;
        }

        router.post(
            calculateStore.url(),
            {
                employee_id: selectedEmployee.id,
                month: Number(selectedMonth),
                year: Number(selectedYear),
                calendar_range: selectedCalendarRange,
                sss_deduction: dtrSummary.sssDeduction,
                pagibig_deduction: dtrSummary.pagibigDeduction,
                ...(isEditingFromSummary ? { source: 'summary' } : {}),
                entries: summaryEntryData.map((entry) => ({
                    date: entry.key,
                    time_in: entry.timeIn || null,
                    time_out: entry.timeOut || null,
                    holiday_type: entry.holidayType,
                    base_rate: entry.baseRate,
                    rate: entry.rate,
                    is_absent: entry.isAbsent,
                })),
            },
            {
                preserveScroll: true,
                preserveState: false,
                onStart: () => setIsSubmittingDtr(true),
                onSuccess: () => setIsSummaryDialogOpen(false),
                onFinish: () => setIsSubmittingDtr(false),
            },
        );
    };

    return {
        canSubmitDtr: monthDays.length > 0 && visiblePage === totalPages,
        confirmDtr,
        dtrSummary,
        getAttendanceEntry,
        goBackToSummary,
        goToNextPage,
        goToPage,
        goToPreviousPage,
        handleCalendarRangeChange,
        handleEmployeeChange,
        handleMonthChange,
        handleRateComputationDialogChange,
        handleSummaryDialogChange,
        handleYearChange,
        isEditingFromSummary,
        isRateComputationDialogOpen: selectedRateComputation !== null,
        isSubmittingDtr,
        isSummaryDialogOpen,
        manualPagibigOverride,
        manualSssOverride,
        monthDays,
        openRateComputation,
        openSummaryDialog,
        pageNumbers,
        paginatedDays,
        selectedCalendarRange,
        selectedEmployee,
        selectedEmployeeId,
        selectedMonth,
        selectedMonthLabel,
        selectedPeriodLabel,
        selectedRateComputation,
        selectedYear,
        setManualPagibigOverride,
        setManualSssOverride,
        startIndex,
        totalPages,
        updateAttendanceEntry,
        visiblePage,
        yearOptions,
    };
}

export type CalculateAttendanceController = ReturnType<
    typeof useCalculateAttendance
>;
