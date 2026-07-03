<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'employee_id',
    'confirmed_by',
    'total_days',
    'total_worked_minutes',
    'total_overtime_minutes',
    'total_overtime_amount',
    'sss_deduction',
    'pagibig_deduction',
    'total_amount',
    'created_by',
    'updated_by',
])]
class Dtr extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_overtime_amount' => 'decimal:2',
            'sss_deduction' => 'decimal:2',
            'pagibig_deduction' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(DtrEntry::class);
    }
}
