<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Punctuality Ranking</title>
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
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>Punctuality Ranking</h1>
            <p><strong>Period:</strong> {{ $periodLabel }}</p>
        </div>
        <img src="{{ public_path('mapiles-icon.png') }}" alt="Mapiles Logo" class="logo">
    </div>

    <div class="meta-grid">
        <div class="meta-card">
            <div class="meta-label">Employees ranked</div>
            <div class="meta-value">{{ count($rankings) }}</div>
        </div>
        @if (count($rankings) > 0)
            <div class="meta-card">
                <div class="meta-label">Top punctuality</div>
                <div class="meta-value">{{ $rankings[0]['punctualityScore'] }}%</div>
            </div>
        @endif
    </div>

    <table>
        <thead>
            <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Punctuality</th>
                <th>On-time days</th>
                <th>Late days</th>
                <th>Late minutes</th>
                <th>Evaluated days</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rankings as $ranking)
                <tr>
                    <td>#{{ $ranking['rank'] }}</td>
                    <td>{{ $ranking['employeeName'] }}</td>
                    <td>{{ number_format($ranking['punctualityScore'], 1) }}%</td>
                    <td>{{ $ranking['onTimeDays'] }}</td>
                    <td>{{ $ranking['lateDays'] }}</td>
                    <td>{{ $ranking['totalLateMinutes'] }} minute{{ $ranking['totalLateMinutes'] === 1 ? '' : 's' }}</td>
                    <td>{{ $ranking['evaluatedDays'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>