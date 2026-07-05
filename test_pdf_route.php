<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$request = Illuminate\Http\Request::capture();
try {
    $dtr = App\Models\Dtr::first();
    echo "DTR ID: " . $dtr->id . "\n";
    echo "Employee ID: " . ($dtr->employee_id ?? 'null') . "\n";
    
    // Simulate route model binding
    $routeDtr = App\Models\Dtr::with(['employee', 'entries'])->findOrFail($dtr->id);
    echo "Resolved: " . $routeDtr->id . "\n";
    
    // Check pdf view can render
    $view = view('pdf.dtr-summary', [
        'employeeName' => 'Test',
        'monthLabel' => 'January',
        'year' => 2026,
        'totalDays' => 20,
        'totalWorkedMinutes' => 9600,
        'regularAmount' => '10000.00',
        'dailyRateBasis' => '500.00',
        'confirmedAt' => now()->toISOString(),
        'totalOvertimeMinutes' => 0,
        'totalOvertimeAmount' => '0.00',
        'sssDeduction' => '0.00',
        'pagibigDeduction' => '0.00',
        'totalAmount' => '10000.00',
        'entries' => [],
    ]);
    echo "View rendered OK\n";
    
    $pdf = Barryvdh\DomPDF\Facade\Pdf::loadHtml($view->render())->setPaper('a4', 'portrait');
    $output = $pdf->output();
    echo "PDF generated: " . strlen($output) . " bytes\n";
    echo "PASS\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Class: " . get_class($e) . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "File: " . $e->getFile() . "\n";
}
