import { index as calculateIndex } from '@/routes/calculate';
import type { BreadcrumbItem } from '@/types';

export type EmployeeScheduleDay = {
    day: number;
    startTime: string;
    endTime: string;
    graceMinutes: number;
};

export type EmployeeOption = {
    id: string;
    fullName: string;
    dailyRate: string;
    monthlyRate: string;
    workDays: number[];
    schedule: EmployeeScheduleDay[];
};

export const SSS_BASE_SALARY = 5250;
export const SSS_BASE_CONTRIBUTION = 250;
export const SSS_INCREMENT_STEP = 500;
export const SSS_INCREMENT_AMOUNT = 25;
export const SSS_MAX_SALARY = 34750;
export const SSS_MAX_CONTRIBUTION = 1750;

export const PAGIBIG_FIXED_RATE = 200;

/** Returns the fixed Pag-IBIG contribution amount (200). */
export function pagibigContribution(): number {
    return PAGIBIG_FIXED_RATE;
}

/** Computes the SSS contribution based on monthly salary brackets. */
export function sssContribution(monthlyRate: number | string | null): number {
    const salary =
        typeof monthlyRate === 'number'
            ? monthlyRate
            : Number(monthlyRate ?? 0);

    if (!Number.isFinite(salary) || salary === 0) {
        return 0;
    }

    if (salary >= SSS_MAX_SALARY) {
        return SSS_MAX_CONTRIBUTION;
    }

    const excess = Math.max(0, salary - SSS_BASE_SALARY);
    const steps = Math.floor(excess / SSS_INCREMENT_STEP);

    return SSS_BASE_CONTRIBUTION + (steps + 1) * SSS_INCREMENT_AMOUNT;
}

export type AttendanceCalendarRange =
    | 'wholeMonth'
    | 'firstTwoWeeks'
    | 'lastTwoWeeks';

export type InitialSelection = {
    employeeId?: string | null;
    month?: number | null;
    year?: number | null;
    calendarRange?: AttendanceCalendarRange | null;
};

export type ActiveDtrEntry = {
    date: string;
    timeIn: string;
    timeOut: string;
    holidayType: HolidayType;
    baseRate: string;
    rate: string;
    isAbsent: boolean;
};

export type ActiveDtr = {
    employeeId: string;
    month: number;
    year: number;
    sssDeduction: string;
    pagibigDeduction: string;
    entries: ActiveDtrEntry[];
};

export type CalculatePageProps = {
    employees: EmployeeOption[];
    initialSelection?: InitialSelection | null;
    isEditingFromSummary?: boolean;
    activeDtr?: ActiveDtr | null;
};

export type HolidayType = 'none' | 'regularHoliday' | 'specialWorkingHoliday';

export type AttendanceField = 'timeIn' | 'timeOut' | 'holidayType' | 'isAbsent';

export type AttendanceEntry = {
    timeIn: string;
    timeOut: string;
    baseRate: string;
    rate: string;
    holidayType: HolidayType;
    isAbsent: boolean;
};

export type AttendanceDefaults = {
    timeIn?: string;
    timeOut?: string;
    dailyRate?: string;
};

export type MonthDay = {
    key: string;
    label: string;
    weekday: string;
    defaultTimeIn: string;
    defaultTimeOut: string;
    graceMinutes: number;
};

export type OvertimeSummaryBreakdown = {
    totalMinutes: number;
    totalDurationLabel: string;
    totalHours: number;
    totalHoursLabel: string;
    rateBasis: string;
    rateBasisLabel: string;
    baseAmount: number;
    baseAmountLabel: string;
    premiumRateLabel: string;
    premiumAmount: number;
    premiumAmountLabel: string;
    totalAmount: number;
    totalAmountLabel: string;
    formulaLabel: string;
};

/** Creates a new AttendanceEntry with sensible defaults (timeIn/timeOut from the schedule, baseRate/rate from the employee's daily rate). */
export function createAttendanceEntry(
    defaults: AttendanceDefaults = {},
): AttendanceEntry {
    return {
        timeIn: defaults.timeIn ?? '',
        timeOut: defaults.timeOut ?? '',
        baseRate: defaults.dailyRate ?? '',
        rate: defaults.dailyRate ?? '',
        holidayType: 'none',
        isAbsent: false,
    };
}

export const monthOptions = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
];

export const attendanceCalendarRangeOptions: Array<{
    label: string;
    value: AttendanceCalendarRange;
}> = [
    { label: 'First two weeks', value: 'firstTwoWeeks' },
    { label: 'Last two weeks', value: 'lastTwoWeeks' },
    { label: 'Whole month', value: 'wholeMonth' },
];

export const holidayOptions: Array<{ label: string; value: HolidayType }> = [
    { label: 'None', value: 'none' },
    { label: 'Regular Holiday', value: 'regularHoliday' },
    {
        label: 'Special Non Working Day',
        value: 'specialWorkingHoliday',
    },
];

export const daysPerPage = 7;
export const breakMinutesPerShift = 60;
export const workHoursPerDay = 8;
export const halfDayLateThresholdMinutes = 180;
export const overtimePremiumRate = 0.25;
export const halfDayEarlyOutThresholdMinutes = 240;
export const LUNCH_START_MINUTES = 720; // 12:00
export const LUNCH_END_MINUTES = 780; // 13:00

/** Pads a number to 2 digits (e.g. 3 → "03"). */
function formatDatePart(value: number): string {
    return value.toString().padStart(2, '0');
}

/** Creates a "YYYY-MM-DD" key from year/month/day numbers. */
function getDateKey(year: number, month: number, day: number): string {
    return `${year}-${formatDatePart(month)}-${formatDatePart(day)}`;
}

/** Extracts the day-of-month (last 2 chars) from a "YYYY-MM-DD" key. */
function getDateKeyDay(dateKey: string): number {
    return Number(dateKey.slice(-2));
}

/** Truncates a time string to "HH:MM" (first 5 chars). */
function normalizeTimeValue(value: string): string {
    return value.length >= 5 ? value.slice(0, 5) : value;
}

/** Parses "HH:MM" into total minutes from midnight. Returns null for invalid input. */
function getMinutesFromTime(value: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(value)) {
        return null;
    }

    const [hours, minutes] = value.split(':').map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    return hours * 60 + minutes;
}

/** Builds a unique storage key for an attendance entry: "employeeId:YYYY-MM-DD". */
export function getAttendanceEntryKey(employeeId: string, dateKey: string) {
    return `${employeeId || 'unassigned'}:${dateKey}`;
}

/** Returns a human-readable label for a calendar-range option. */
export function getAttendanceCalendarRangeLabel(
    value: AttendanceCalendarRange,
): string {
    return (
        attendanceCalendarRangeOptions.find((option) => option.value === value)
            ?.label ?? 'Whole month'
    );
}

/** Returns the start/end day-of-month for the given calendar range (whole month / first 2 weeks / last 2 weeks). */
export function getAttendanceCalendarRangeDayBounds(
    year: number,
    month: number,
    value: AttendanceCalendarRange,
): { startDay: number; endDay: number } {
    const totalDays = new Date(year, month, 0).getDate();

    switch (value) {
        case 'firstTwoWeeks':
            return {
                startDay: 1,
                endDay: Math.min(15, totalDays),
            };
        case 'lastTwoWeeks':
            return {
                startDay: Math.min(16, totalDays),
                endDay: totalDays,
            };
        case 'wholeMonth':
        default:
            return {
                startDay: 1,
                endDay: totalDays,
            };
    }
}

/** Returns a display label like "January 1-15, 2026" or "January 2026". */
export function getAttendanceCalendarPeriodLabel(
    year: number,
    month: number,
    value: AttendanceCalendarRange,
): string {
    const monthLabel =
        monthOptions.find((monthOption) => monthOption.value === month)
            ?.label ?? 'Selected month';

    if (value === 'wholeMonth') {
        return `${monthLabel} ${year}`;
    }

    const { startDay, endDay } = getAttendanceCalendarRangeDayBounds(
        year,
        month,
        value,
    );

    return `${monthLabel} ${startDay}-${endDay}, ${year}`;
}

/** Filters the full list of month days to only those within the selected calendar range (whole month / first 2 weeks / last 2 weeks). */
export function filterMonthDaysByAttendanceCalendarRange(
    monthDays: MonthDay[],
    year: number,
    month: number,
    value: AttendanceCalendarRange,
): MonthDay[] {
    const { startDay, endDay } = getAttendanceCalendarRangeDayBounds(
        year,
        month,
        value,
    );

    return monthDays.filter((day) => {
        const dayOfMonth = getDateKeyDay(day.key);

        return dayOfMonth >= startDay && dayOfMonth <= endDay;
    });
}

/** Returns the total minutes between timeIn and timeOut (handles overnight spans). Does NOT subtract the break. */
export function getShiftDurationMinutes(
    timeIn: string,
    timeOut: string,
): number | null {
    const timeInMinutes = getMinutesFromTime(timeIn);
    const timeOutMinutes = getMinutesFromTime(timeOut);

    if (timeInMinutes === null || timeOutMinutes === null) {
        return null;
    }

    return timeOutMinutes >= timeInMinutes
        ? timeOutMinutes - timeInMinutes
        : 24 * 60 - timeInMinutes + timeOutMinutes;
}

/** Returns break minutes to deduct: 60 if the worked range overlaps with the lunch break window (12:00-13:00), 0 otherwise. */
export function getLunchBreakMinutes(
    timeIn: string,
    timeOut: string,
): number {
    const timeInMinutes = getMinutesFromTime(timeIn);
    const timeOutMinutes = getMinutesFromTime(timeOut);

    if (timeInMinutes === null || timeOutMinutes === null) {
        return breakMinutesPerShift;
    }

    if (timeOutMinutes < timeInMinutes) {
        return 0;
    }

    const overlapsLunch =
        timeInMinutes < LUNCH_END_MINUTES &&
        LUNCH_START_MINUTES < timeOutMinutes;

    return overlapsLunch ? breakMinutesPerShift : 0;
}

/** Returns actual productive minutes: shift duration minus the lunch break deduction (if applicable). */
export function getWorkedMinutes(
    timeIn: string,
    timeOut: string,
): number | null {
    const totalMinutes = getShiftDurationMinutes(timeIn, timeOut);

    if (totalMinutes === null) {
        return null;
    }

    return Math.max(0, totalMinutes - getLunchBreakMinutes(timeIn, timeOut));
}

/** Returns overtime minutes: actual worked minutes minus scheduled worked minutes. */
export function getOvertimeMinutes(
    workedMinutes: number | null,
    scheduledTimeIn: string,
    scheduledTimeOut: string,
): number {
    const scheduledWorkedMinutes = getWorkedMinutes(
        scheduledTimeIn,
        scheduledTimeOut,
    );

    if (workedMinutes === null || scheduledWorkedMinutes === null) {
        return 0;
    }

    return Math.max(0, workedMinutes - scheduledWorkedMinutes);
}

/** Returns the overtime amount for a day: (overtimeMinutes / 60) * (dailyRate / 8) * (1 + premiumRate). */
export function getOvertimeAmount(
    overtimeMinutes: number,
    dailyRate: string,
): number {
    if (overtimeMinutes <= 0) return 0;
    const parsedDailyRate = Number(dailyRate);
    if (!Number.isFinite(parsedDailyRate) || parsedDailyRate <= 0) return 0;
    const hourlyRate = parsedDailyRate / workHoursPerDay;
    const baseAmount = (overtimeMinutes / 60) * hourlyRate;
    return baseAmount * (1 + overtimePremiumRate);
}

/** Converts minutes to a human-friendly string like "7h 30m" or "8h". */
export function formatWorkedDuration(totalMinutes: number | null): string {
    if (totalMinutes === null) {
        return '--';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
}

/** Formats a decimal number of hours to 2 decimal places (e.g. 7.50). */
export function formatDecimalHours(value: number): string {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/** Returns the daily-rate multiplier for a holiday type (none=1, regular=2, special working=1.3). */
export function getHolidayMultiplier(holidayType: HolidayType): number {
    switch (holidayType) {
        case 'regularHoliday':
            return 2;
        case 'specialWorkingHoliday':
            return 1.3;
        case 'none':
        default:
            return 1;
    }
}

/** Returns a human-readable label for a holiday type (e.g. "Regular Holiday"). */
export function getHolidayLabel(holidayType: HolidayType): string {
    return (
        holidayOptions.find(
            (holidayOption) => holidayOption.value === holidayType,
        )?.label ?? 'None'
    );
}

/** Returns the holiday premium amount: baseRate * (multiplier - 1). E.g. regular holiday PHP 500 → extra PHP 500. */
export function getHolidayPremium(
    baseRate: string,
    holidayType: HolidayType,
): number {
    if (baseRate.trim() === '') return 0;
    const parsedBaseRate = Number(baseRate);
    if (!Number.isFinite(parsedBaseRate)) return 0;
    const multiplier = getHolidayMultiplier(holidayType);
    return parsedBaseRate * (multiplier - 1);
}

/** Formats a number as a PHP currency string (e.g. "PHP 1,234.56"). Returns "--" for invalid values. */
export function formatRateAmount(value: number | string): string {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsedValue)) {
        return '--';
    }

    return `PHP ${parsedValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/** Builds a full overtime breakdown: base amount + 25% premium, with formula labels. */
export function buildOvertimeSummary(
    totalMinutes: number,
    dailyRate: string,
): OvertimeSummaryBreakdown {
    const parsedDailyRate = Number(dailyRate);
    const hasRateBasis =
        dailyRate.trim() !== '' && Number.isFinite(parsedDailyRate);
    const safeHourlyRateBasis = hasRateBasis
        ? parsedDailyRate / workHoursPerDay
        : 0;
    const totalHours = totalMinutes / 60;
    const baseAmount = totalHours * safeHourlyRateBasis;
    const premiumAmount = baseAmount * overtimePremiumRate;
    const totalAmount = baseAmount + premiumAmount;

    let formulaLabel = 'No overtime minutes were recorded for this DTR.';

    if (totalMinutes > 0 && !hasRateBasis) {
        formulaLabel = `${totalMinutes} overtime minutes were recorded, but the employee hourly rate is unavailable so overtime pay stays ${formatRateAmount(0)}.`;
    } else if (totalMinutes > 0) {
        formulaLabel = `${totalMinutes} mins / 60 = ${formatDecimalHours(totalHours)} hours. ${formatDecimalHours(totalHours)} x ${formatRateAmount(safeHourlyRateBasis)} = ${formatRateAmount(baseAmount)}. ${formatRateAmount(baseAmount)} + 25% (${formatRateAmount(premiumAmount)}) = ${formatRateAmount(totalAmount)}.`;
    }

    return {
        totalMinutes,
        totalDurationLabel: formatWorkedDuration(totalMinutes),
        totalHours,
        totalHoursLabel: `${formatDecimalHours(totalHours)} hours`,
        rateBasis: hasRateBasis ? safeHourlyRateBasis.toFixed(2) : '',
        rateBasisLabel: hasRateBasis
            ? formatRateAmount(safeHourlyRateBasis)
            : '--',
        baseAmount,
        baseAmountLabel: formatRateAmount(baseAmount),
        premiumRateLabel: `${Math.round(overtimePremiumRate * 100)}%`,
        premiumAmount,
        premiumAmountLabel: formatRateAmount(premiumAmount),
        totalAmount,
        totalAmountLabel: formatRateAmount(totalAmount),
        formulaLabel,
    };
}

/** Applies the holiday multiplier to the base daily rate. E.g. regular holiday → rate * 2. */
export function getAdjustedDailyRate(
    dailyRate: string,
    holidayType: HolidayType,
): string {
    if (dailyRate.trim() === '') {
        return '';
    }

    const parsedDailyRate = Number(dailyRate);

    if (!Number.isFinite(parsedDailyRate)) {
        return '';
    }

    return (parsedDailyRate * getHolidayMultiplier(holidayType)).toFixed(2);
}

/** Returns late minutes after grace period: max(0, actualTimeIn - scheduledTimeIn - graceMinutes). Returns null if either time is invalid. */
export function getLateMinutes(
    timeIn: string,
    scheduledTimeIn: string,
    graceMinutes: number,
): number | null {
    const actualTimeInMinutes = getMinutesFromTime(timeIn);
    const scheduledTimeInMinutes = getMinutesFromTime(scheduledTimeIn);

    if (actualTimeInMinutes === null || scheduledTimeInMinutes === null) {
        return null;
    }

    return Math.max(
        0,
        actualTimeInMinutes -
            scheduledTimeInMinutes -
            Math.max(0, graceMinutes),
    );
}

/** Returns true if the employee clocked in >= halfDayLateThresholdMinutes (currently 180) after their scheduled start — triggers half-day salary. */
export function isHalfDayTimeIn(
    timeIn: string,
    scheduledTimeIn: string,
): boolean {
    const actualTimeInMinutes = getMinutesFromTime(timeIn);
    const scheduledTimeInMinutes = getMinutesFromTime(scheduledTimeIn);

    if (actualTimeInMinutes === null || scheduledTimeInMinutes === null) {
        return false;
    }

    return (
        actualTimeInMinutes >=
        scheduledTimeInMinutes + halfDayLateThresholdMinutes
    );
}

/** Returns true if the employee clocked out early enough that their total worked minutes fall below the half-day threshold — triggers half-day salary. */
export function isHalfDayEarlyOut(timeIn: string, timeOut: string): boolean {
    const workedMinutes = getWorkedMinutes(timeIn, timeOut);

    if (workedMinutes === null) return false;

    return workedMinutes <= halfDayEarlyOutThresholdMinutes;
}

/** Computes the final daily rate for a day: starts with adjustedDailyRate (base × holiday), then applies half-day or late penalty as appropriate. */
export function getComputedDailyRate(
    baseDailyRate: string,
    holidayType: HolidayType,
    timeIn: string,
    scheduledTimeIn: string,
    graceMinutes: number,
    timeOut: string,
): string {
    const adjustedDailyRate = getAdjustedDailyRate(baseDailyRate, holidayType);

    if (adjustedDailyRate === '') {
        return '';
    }

    const parsedAdjustedDailyRate = Number(adjustedDailyRate);

    if (!Number.isFinite(parsedAdjustedDailyRate)) {
        return '';
    }

    if (isHalfDayTimeIn(timeIn, scheduledTimeIn)) {
        return (parsedAdjustedDailyRate / 2).toFixed(2);
    }

    if (isHalfDayEarlyOut(timeIn, timeOut)) {
        return (parsedAdjustedDailyRate / 2).toFixed(2);
    }

    const lateMinutes = getLateMinutes(timeIn, scheduledTimeIn, graceMinutes);

    if (lateMinutes === null) {
        return adjustedDailyRate;
    }

    return Math.max(0, parsedAdjustedDailyRate - lateMinutes).toFixed(2);
}

/** Inverse of getAdjustedDailyRate: divides the given rate by the holiday multiplier to recover the original base rate. Used when loading a stored entry so the base rate stays consistent regardless of holiday. */
export function getBaseDailyRate(
    rate: string,
    holidayType: HolidayType,
): string {
    if (rate.trim() === '') {
        return '';
    }

    const parsedRate = Number(rate);

    if (!Number.isFinite(parsedRate)) {
        return '';
    }

    return (parsedRate / getHolidayMultiplier(holidayType)).toFixed(2);
}

/** Builds an array of MonthDay objects for every calendar day in the given month/year that matches the employee's schedule (by day-of-week). Non-working days are excluded. */
export function buildMonthDays(
    year: number,
    month: number,
    schedule: EmployeeScheduleDay[],
): MonthDay[] {
    const scheduleByDay = new Map(
        schedule.map((scheduleDay) => [
            scheduleDay.day,
            {
                defaultTimeIn: normalizeTimeValue(scheduleDay.startTime),
                defaultTimeOut: normalizeTimeValue(scheduleDay.endTime),
                graceMinutes: Number.isFinite(scheduleDay.graceMinutes)
                    ? Math.max(0, scheduleDay.graceMinutes)
                    : 0,
            },
        ]),
    );

    if (scheduleByDay.size === 0) {
        return [];
    }

    const totalDays = new Date(year, month, 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        const date = new Date(year, month - 1, day);
        const daySchedule = scheduleByDay.get(date.getDay());

        if (!daySchedule) {
            return null;
        }

        return {
            key: getDateKey(year, month, day),
            label: date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            }),
            weekday: date.toLocaleDateString('en-US', {
                weekday: 'long',
            }),
            defaultTimeIn: daySchedule.defaultTimeIn,
            defaultTimeOut: daySchedule.defaultTimeOut,
            graceMinutes: daySchedule.graceMinutes,
        };
    }).filter((day): day is MonthDay => day !== null);
}

export const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Calculate',
        href: calculateIndex(),
    },
];
