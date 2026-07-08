<?php

namespace App\Observers;

use App\Models\Dtr;
use App\Services\Audit\AuditLogger;

class DtrObserver
{
    public function __construct(protected AuditLogger $logger) {}

    public function created(Dtr $dtr): void
    {
        $this->logger->log('created', $dtr, null, $dtr->toArray());
    }

    public function updated(Dtr $dtr): void
    {
        $changed = $dtr->getDirty();

        foreach ($dtr->getAuditIgnore() as $field) {
            unset($changed[$field]);
        }

        if (empty($changed)) {
            return;
        }

        $original = $dtr->getOriginal();
        $old = [];
        $new = [];

        foreach ($changed as $key => $value) {
            $old[$key] = $original[$key] ?? null;
            $new[$key] = $value;
        }

        $this->logger->log('updated', $dtr, $old, $new);
    }

    public function deleted(Dtr $dtr): void
    {
        $this->logger->log('deleted', $dtr, $dtr->toArray(), null);
    }
}
