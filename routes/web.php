<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CalculateController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\RankingController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SummaryController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    // Routes accessible by ALL authenticated users (admin, management, employee)
    Route::get('ranking', [RankingController::class, 'index'])->name('ranking.index');
    Route::get('ranking/pdf', [RankingController::class, 'exportPdf'])->name('ranking.export-pdf');
    Route::post('ranking/batch-export', [RankingController::class, 'batchExport'])->name('ranking.batch-export');

    // Employee-only routes
    Route::middleware('role:employee')->group(function () {
        Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule.index');
    });

    // Admin + Management routes
    Route::middleware('role:admin,management')->group(function () {
        Route::get('employees', [EmployeeController::class, 'index'])->name('employees.index');
        Route::post('employees', [EmployeeController::class, 'store'])->name('employees.store');
        Route::put('employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::patch('employees/{employee}/status', [EmployeeController::class, 'updateStatus'])->name('employees.update-status');
        Route::delete('employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('can:access-admin-ui')->name('employees.destroy');
        Route::post('employees/batch-delete', [EmployeeController::class, 'batchDestroy'])->middleware('can:access-admin-ui')->name('employees.batch-destroy');

        Route::get('calculate', [CalculateController::class, 'index'])->name('calculate.index');
        Route::post('calculate', [CalculateController::class, 'store'])->name('calculate.store');

        Route::get('summary', [SummaryController::class, 'index'])->name('summary.index');
        Route::get('summary/{dtr}/export', [SummaryController::class, 'export'])->name('summary.export');
        Route::post('summary/batch-export', [SummaryController::class, 'batchExport'])->name('summary.batch-export');
        Route::post('summary/batch-delete', [SummaryController::class, 'batchDestroy'])->name('summary.batch-destroy');
        Route::delete('summary/{dtr}', [SummaryController::class, 'destroy'])->name('summary.destroy');

        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::patch('users/{user}/status', [UserController::class, 'updateStatus'])->name('users.update-status');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        Route::post('users/{user}/link-employee', [UserController::class, 'linkEmployee'])->name('users.link-employee');
        Route::delete('users/{user}/unlink-employee', [UserController::class, 'unlinkEmployee'])->name('users.unlink-employee');
    });

    // Admin-only routes
    Route::middleware('role:admin')->group(function () {
        Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::post('audit-logs/log-export', [AuditLogController::class, 'logExport'])->name('audit-logs.log-export');
    });
});

require __DIR__.'/settings.php';
