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
        h1 {
            margin: 0 0 8px;
            font-size: 22px;
        }
        p {
            margin: 4px 0;
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
    <h1>DTR Summary</h1>
    <p><strong>Employee:</strong> {{ $employeeName }}</p>
    <p><strong>Period:</strong> {{ $monthLabel }} {{ $year }}</p>
    @if ($confirmedAt)
        <p><strong>Confirmed at:</strong> {{ \Carbon\Carbon::parse($confirmedAt)->format('M j, Y, g:i A') }}</p>
    @endif

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
            <div class="meta-label">Total pay</div>
            <div class="meta-value">PHP {{ number_format((float) $totalAmount, 2) }}</div>
        </div>
    </div>

    @if ($totalOvertimeMinutes > 0)
        @php
            $dailyRateNum = (float) $dailyRateBasis;
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
