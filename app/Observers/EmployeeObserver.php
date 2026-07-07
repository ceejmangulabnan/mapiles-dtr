<?php

namespace App\Observers;

use App\Models\Employee;
use App\Services\Audit\AuditLogger;

class EmployeeObserver
{
    public function __construct(protected AuditLogger $logger)
    {
    }

    public function created(Employee $employee): void
    {
        $this->logger->log('created', $employee, null, $employee->toArray());
    }

    public function updated(Employee $employee): void
    {
        $changed = $employee->getDirty();

        foreach ($employee->getAuditIgnore() as $field) {
            unset($changed[$field]);
        }

        if (empty($changed)) {
            return;
        }

        $original = $employee->getOriginal();
        $old = [];
        $new = [];

        foreach ($changed as $key => $value) {
            $old[$key] = $original[$key] ?? null;
            $new[$key] = $value;
        }

        $this->logger->log('updated', $employee, $old, $new);
    }

    public function deleted(Employee $employee): void
    {
        $this->logger->log('deleted', $employee, $employee->toArray(), null);
    }
}
