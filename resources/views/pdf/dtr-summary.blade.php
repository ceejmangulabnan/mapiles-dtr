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
        th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: left;
            font-size: 12px;
        }
        th {
            background: #f3f4f6;
        }
        .meta-grid {
            margin-top: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        .meta-card {
            border: 1px solid #d1d5db;
            padding: 10px 14px;
            min-width: 120px;
            flex: 1;
        }
        .meta-label {
            color: #6b7280;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .meta-value {
            margin-top: 4px;
            font-weight: 700;
            font-size: 15px;
        }
        .overtime-note {
            margin-top: 16px;
            padding: 12px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>DTR Summary</h1>
            <p><strong>Employee:</strong> {{ $employeeName }}</p>
            <p><strong>Period:</strong> {{ $monthLabel }} {{ $year }}</p>
            @if ($confirmedAt)
                <p><strong>Confirmed at:</strong> {{ \Carbon\Carbon::parse($confirmedAt)->format('M j, Y, g:i A') }}</p>
            @endif
        </div>
        <img src="{{ public_path('mapiles-icon.png') }}" alt="Mapiles Logo" class="logo">
    </div>

    <div class="meta-grid">
        <div class="meta-card">
            <div class="meta-label">Workdays</div>
            <div class="meta-value">{{ $totalDays }}</div>
        </div>
        <div class="meta-card">
            <div class="meta-label">Total hours</div>
            <div class="meta-value">{{ floor($totalWorkedMinutes / 60) }}h{{ $totalWorkedMinutes % 60 > 0 ? ' ' . ($totalWorkedMinutes % 60) . 'm' : '' }}</div>
        </div>
        <div class="meta-card">
            <div class="meta-label">Regular pay</div>
            <div class="meta-value">PHP {{ number_format((float) $regularAmount, 2) }}</div>
        </div>
        <div class="meta-card">
            <div class="meta-label">Overtime pay</div>
            <div class="meta-value">PHP {{ number_format((float) $totalOvertimeAmount, 2) }}</div>
        </div>
        <div class="meta-card">
            <div class="meta-label">SSS deduction</div>
            <div class="meta-value" style="color:#dc2626;">-PHP {{ number_format((float) ($sssDeduction ?? 0), 2) }}</div>
        </div>
        <div class="meta-card">
            <div class="meta-label">Pag-IBIG deduction</div>
            <div class="meta-value" style="color:#dc2626;">-PHP {{ number_format((float) ($pagibigDeduction ?? 0), 2) }}</div>
        </div>
        <div class="meta-card">
            <div class="meta-label">Total pay</div>
            <div class="meta-value">PHP {{ number_format((float) $totalAmount, 2) }}</div>
        </div>
    </div>

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
                {{ $entry['label'] }}: PHP {{ number_format((float) ($entry['baseRate'] ?: $dailyRateNum), 2) }} x 2 = PHP {{ number_format($computed, 2) }}
                @if (!$loop->last) | @endif
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
                {{ $entry['label'] }}: PHP {{ number_format((float) ($entry['baseRate'] ?: $dailyRateNum), 2) }} x 1.3 = PHP {{ number_format($computed, 2) }}
                @if (!$loop->last) | @endif
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
            {{ number_format($totalHours, 2) }} x PHP {{ number_format($hourlyRateBasis, 2) }} = PHP {{ number_format($baseOvertimeAmount, 2) }}.
            PHP {{ number_format($baseOvertimeAmount, 2) }} + 25% (PHP {{ number_format($premiumAmount, 2) }}) = PHP {{ number_format($totalOvertime, 2) }}.
        </div>
    @else
        <div class="overtime-note">
            <strong>Overtime computation:</strong> No overtime minutes were recorded for this DTR.
        </div>
    @endif

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
                <tr>
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
                    <td>{{ floor($entry['workedMinutes'] / 60) }}h{{ $entry['workedMinutes'] % 60 > 0 ? ' ' . ($entry['workedMinutes'] % 60) . 'm' : '' }}</td>
                    <td>PHP {{ number_format((float) ($entry['rate'] ?: '0'), 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
