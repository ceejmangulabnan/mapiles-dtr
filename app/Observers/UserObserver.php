<?php

namespace App\Observers;

use App\Models\User;
use App\Services\Audit\AuditLogger;

class UserObserver
{
    public function __construct(protected AuditLogger $logger) {}

    public function created(User $user): void
    {
        $this->logger->log('created', $user, null, $user->toArray());
    }

    public function updated(User $user): void
    {
        $changed = $user->getDirty();

        foreach ($user->getAuditIgnore() as $field) {
            unset($changed[$field]);
        }

        if (empty($changed)) {
            return;
        }

        $original = $user->getOriginal();
        $old = [];
        $new = [];

        foreach ($changed as $key => $value) {
            $old[$key] = $original[$key] ?? null;
            $new[$key] = $value;
        }

        $this->logger->log('updated', $user, $old, $new);
    }

    public function deleted(User $user): void
    {
        $this->logger->log('deleted', $user, $user->toArray(), null);
    }
}
