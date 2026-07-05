<?php

namespace App\Models;

use Database\Factories\EmployeeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'first_name',
    'middle_name',
    'last_name',
    'monthly_rate',
    'hourly_rate',
    'daily_rate',
    'employment_end_date',
    'scheduled_start_time',
    'scheduled_end_time',
    'grace_period_minutes',
    'work_days',
    'weekly_schedule',
    'user_id',
    'created_by',
    'updated_by'
])]
class Employee extends Model
{
    /** @use HasFactory<EmployeeFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'monthly_rate' => 'decimal:2',
            'hourly_rate' => 'decimal:2',
            'daily_rate' => 'decimal:2',
            'employment_end_date' => 'date',
            'work_days' => 'array',
            'weekly_schedule' => 'array',
        ];
    }
}
