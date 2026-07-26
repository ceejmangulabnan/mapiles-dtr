<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    protected static bool $enabled = true;

    protected ?Request $request;

    public function __construct(?Request $request = null)
    {
        $this->request = $request ?? request();
    }

    public static function disable(): void
    {
        self::$enabled = false;
    }

    public static function enable(): void
    {
        self::$enabled = true;
    }

    public static function disabled(callable $callback): mixed
    {
        self::disable();

        try {
            return $callback();
        } finally {
            self::enable();
        }
    }

    public function log(string $action, Model $model, ?array $oldValues = null, ?array $newValues = null): ?AuditLog
    {
        if (! self::$enabled) {
            return null;
        }

        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'auditable_type' => $model->getMorphClass(),
            'auditable_id' => $model->getKey(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
        ]);
    }

    public function logWithoutModel(string $action, ?array $metadata = null): ?AuditLog
    {
        if (! self::$enabled) {
            return null;
        }

        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'auditable_type' => 'auth',
            'auditable_id' => '0',
            'old_values' => null,
            'new_values' => $metadata,
            'ip_address' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
        ]);
    }
}
