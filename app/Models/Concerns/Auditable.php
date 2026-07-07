<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait Auditable
{
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }

    public function getAuditIgnore(): array
    {
        return property_exists($this, 'auditIgnore') && is_array($this->auditIgnore)
            ? $this->auditIgnore
            : config('audit.ignored_fields', ['updated_at', 'remember_token']);
    }
}
