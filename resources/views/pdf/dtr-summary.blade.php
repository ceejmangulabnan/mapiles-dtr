<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>DTR Summary</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 32px;
            color: #111827;
            font-size: 13px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .header-left {
            flex: 1;
        }

        .logo {
            position: fixed;
            top: 32px;
            right: 32px;
            width: 80px;
            height: auto;
        }

        h1 {
            margin: 0 0 4px;
            font-size: 22px;
        }

        p {
            margin: 2px 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th,
        td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: left;
            font-size: 12px;
        }

        th {
            background: #f3f4f6;
        }

        .meta-table {
            margin-top: 12px;
            width: 100%;
            border-collapse: collapse;
        }

        .meta-table td {
            border: 1px solid #d1d5db;
            padding: 4px 10px;
            width: 33.33%;
        }

        .meta-label {
            color: #6b7280;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .meta-value {
            font-weight: 700;
            font-size: 12px;
        }


        .overtime-note {
            margin-top: 8px;
            padding: 12px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            font-size: 12px;
        }

        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 48px;
            font-weight: bold;
            color: rgba(180, 180, 180, 0.35);
            letter-spacing: 6px;
            z-index: 9999;
            pointer-events: none;
            white-space: nowrap;
        }

        .remark-absent {
            background-color: rgba(252, 165, 165, 0.35);
        }

        .remark-overtime {
            background-color: rgba(253, 224, 71, 0.35);
        }

        .remark-halfday {
            background-color: rgba(147, 197, 253, 0.35);
        }

        .remark-regular-holiday {
            background-color: rgba(134, 239, 172, 0.35);
        }

        .remark-special-holiday {
            background-color: rgba(253, 186, 116, 0.35);
        }

        .remark-late {
            background-color: rgba(180, 130, 80, 0.35);
        }

        .legend {
            margin-top: 8px;
            margin-bottom: 4px;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
        }

        .legend-items {
            display: flex;
            flex-wrap: wrap;
            gap: 10px 20px;
        }

        .legend-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
        }

        .legend-color {
            width: 10px;
            height: 10px;
            border: 1px solid #d1d5db;
            display: inline-block;
            vertical-align: middle;
        }

        .legend-color-absent { background-color: rgba(252, 165, 165, 0.35); }
        .legend-color-overtime { background-color: rgba(253, 224, 71, 0.35); }
        .legend-color-halfday { background-color: rgba(147, 197, 253, 0.35); }
        .legend-color-regular-holiday { background-color: rgba(134, 239, 172, 0.35); }
        .legend-color-special-holiday { background-color: rgba(253, 186, 116, 0.35); }
        .legend-color-late { background-color: rgba(180, 130, 80, 0.35); }
    </style>
</head>

<body>
    <div class="watermark">{{ $watermarkLabel }}</div>
    <div class="header">
        <div class="header-left">
            <h1>DTR Summary</h1>
            <p><strong>Employee:</strong> {{ $employeeName }}</p>
            <p><strong>Period:</strong> {{ $monthLabel }} {{ $year }}</p>
            @if ($confirmedAt)
                <p><strong>Confirmed at:</strong> {{ $confirmedAt }}</p>
            @endif
        </div>
        <img src="{{ public_path('mapiles-icon.png') }}" alt="Mapiles Logo" class="logo">
    </div>

    <table class="meta-table">
        <tr>
            <td>
                <div class="meta-label">Workdays</div>
                <div class="meta-value">{{ $totalDays }}</div>
            </td>
            <td>
                <div class="meta-label">Total hours</div>
                <div class="meta-value">
                    {{ floor($totalWorkedMinutes / 60) }}h{{ $totalWorkedMinutes % 60 > 0 ? ' ' . $totalWorkedMinutes % 60 . 'm' : '' }}
                </div>
            </td>
            <td>
                <div class="meta-label">Regular pay</div>
                <div class="meta-value">PHP {{ number_format((float) $regularAmount, 2) }}</div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="meta-label">Overtime pay</div>
                <div class="meta-value">PHP {{ number_format((float) $totalOvertimeAmount, 2) }}</div>
            </td>
            <td>
                <div class="meta-label">SSS deduction</div>
                <div class="meta-value" style="color:#dc2626;">-PHP
                    {{ number_format((float) ($sssDeduction ?? 0), 2) }}</div>
            </td>
            <td>
                <div class="meta-label">Pag-IBIG deduction</div>
                <div class="meta-value" style="color:#dc2626;">-PHP
                    {{ number_format((float) ($pagibigDeduction ?? 0), 2) }}</div>
            </td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="meta-label">Total pay</div>
                <div class="meta-value">PHP {{ number_format((float) $totalAmount, 2) }}</div>
            </td>
        </tr>
    </table>

    @php
        $regularHolidays = array_filter($entries, fn($e) => $e['holidayType'] === 'regularHoliday');
        $specialHolidays = array_filter($entries, fn($e) => $e['holidayType'] === 'specialWorkingHoliday');
        $dailyRateNum = (float) $dailyRateBasis;
    @endphp

    @if (count($regularHolidays) > 0)
        <div class="overtime-note">
            <strong>Regular Holiday computation (200%):</strong>
            @foreach ($regularHolidays as $entry)
                @php
                    $computed = (float) ($entry['baseRate'] ?: $dailyRateNum) * 2;
                @endphp
                {{ $entry['label'] }}: PHP {{ number_format((float) ($entry['baseRate'] ?: $dailyRateNum), 2) }} x 2 =
                PHP {{ number_format($computed, 2) }}
                @if (!$loop->last)
                    |
                @endif
            @endforeach
        </div>
    @endif

    @if (count($specialHolidays) > 0)
        <div class="overtime-note">
            <strong>Special Holiday computation (130%):</strong>
            @foreach ($specialHolidays as $entry)
                @php
                    $computed = (float) ($entry['baseRate'] ?: $dailyRateNum) * 1.3;
                @endphp
                {{ $entry['label'] }}: PHP {{ number_format((float) ($entry['baseRate'] ?: $dailyRateNum), 2) }} x 1.3
                = PHP {{ number_format($computed, 2) }}
                @if (!$loop->last)
                    |
                @endif
            @endforeach
        </div>
    @endif

    @if ($totalOvertimeMinutes > 0)
        @php
            $hourlyRateBasis = $dailyRateNum > 0 ? $dailyRateNum / 8 : 0;
            $totalHours = $totalOvertimeMinutes / 60;
            $baseOvertimeAmount = $totalHours * $hourlyRateBasis;
            $premiumAmount = $baseOvertimeAmount * 0.25;
            $totalOvertime = $baseOvertimeAmount + $premiumAmount;
        @endphp
        <div class="overtime-note">
            <strong>Overtime computation:</strong>
            {{ $totalOvertimeMinutes }} mins / 60 = {{ number_format($totalHours, 2) }} hours.
            {{ number_format($totalHours, 2) }} x PHP {{ number_format($hourlyRateBasis, 2) }} = PHP
            {{ number_format($baseOvertimeAmount, 2) }}.
            PHP {{ number_format($baseOvertimeAmount, 2) }} + 25% (PHP {{ number_format($premiumAmount, 2) }}) = PHP
            {{ number_format($totalOvertime, 2) }}.
        </div>
    @else
        <div class="overtime-note">
            <strong>Overtime computation:</strong> No overtime minutes were recorded for this DTR.
        </div>
    @endif

    <div class="legend">
        <div class="legend-items">
            <div class="legend-item">
                <span class="legend-color legend-color-absent"></span>
                <span>Absent</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-color-overtime"></span>
                <span>Overtime</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-color-halfday"></span>
                <span>Half Day</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-color-regular-holiday"></span>
                <span>Regular Holiday</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-color-special-holiday"></span>
                <span>Special Non Working Day</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-color-late"></span>
                <span>Late</span>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Time in</th>
                <th>Time out</th>
                <th>Holiday</th>
                <th>Hours</th>
                <th>Rate</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($entries as $entry)
                @php
                    $displayRate = $entry['isOvertime'] ? $entry['rateWithOvertime'] : ($entry['rate'] ?: '0');

                    $rowClass = '';
                    if ($entry['isAbsent']) {
                        $rowClass = 'remark-absent';
                    } elseif ($entry['isOvertime']) {
                        $rowClass = 'remark-overtime';
                    } elseif ($entry['isHalfDay']) {
                        $rowClass = 'remark-halfday';
                    } elseif ($entry['isLate']) {
                        $rowClass = 'remark-late';
                    } elseif ($entry['holidayType'] === 'regularHoliday') {
                        $rowClass = 'remark-regular-holiday';
                    } elseif ($entry['holidayType'] === 'specialWorkingHoliday') {
                        $rowClass = 'remark-special-holiday';
                    }
                @endphp
                <tr class="{{ $rowClass }}">
                    <td>{{ $entry['label'] }}</td>
                    <td>{{ $entry['weekday'] }}</td>
                    <td>{{ $entry['timeIn'] ?: '--' }}</td>
                    <td>{{ $entry['timeOut'] ?: '--' }}</td>
                    <td>
                        @switch($entry['holidayType'])
                            @case('regularHoliday')
                                Regular Holiday
                            @break

                            @case('specialWorkingHoliday')
                                Special Non Working Day
                            @break

                            @default
                                None
                        @endswitch
                    </td>
                    <td>{{ floor($entry['workedMinutes'] / 60) }}h{{ $entry['workedMinutes'] % 60 > 0 ? ' ' . $entry['workedMinutes'] % 60 . 'm' : '' }}
                    </td>
                    <td>PHP {{ number_format((float) $displayRate, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>

</html>
