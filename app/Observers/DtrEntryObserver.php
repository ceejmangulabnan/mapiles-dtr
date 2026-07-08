<?php

namespace App\Observers;

use App\Models\DtrEntry;
use App\Services\Audit\AuditLogger;

class DtrEntryObserver
{
    public function __construct(protected AuditLogger $logger) {}

    public function created(DtrEntry $dtrEntry): void
    {
        $this->logger->log('created', $dtrEntry, null, $dtrEntry->toArray());
    }

    public function updated(DtrEntry $dtrEntry): void
    {
        $changed = $dtrEntry->getDirty();

        foreach ($dtrEntry->getAuditIgnore() as $field) {
            unset($changed[$field]);
        }

        if (empty($changed)) {
            return;
        }

        $original = $dtrEntry->getOriginal();
        $old = [];
        $new = [];

        foreach ($changed as $key => $value) {
            $old[$key] = $original[$key] ?? null;
            $new[$key] = $value;
        }

        $this->logger->log('updated', $dtrEntry, $old, $new);
    }

    public function deleted(DtrEntry $dtrEntry): void
    {
        $this->logger->log('deleted', $dtrEntry, $dtrEntry->toArray(), null);
    }
}
