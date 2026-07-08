<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Services\Audit\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function __construct(protected AuditLogger $auditLogger) {}

    public function index(Request $request): Response
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }
        $typeMap = [
            'App\\Models\\Employee' => 'Employee',
            'App\\Models\\User' => 'User',
            'App\\Models\\Dtr' => 'DTR',
            'App\\Models\\DtrEntry' => 'DTR Entry',
            'auth' => 'Authentication',
        ];

        $reverseTypeMap = array_flip($typeMap);

        $query = AuditLog::query()
            ->with('user')
            ->latest('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('auditable_type')) {
            $query->where('auditable_type', $reverseTypeMap[$request->input('auditable_type')] ?? $request->input('auditable_type'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('month')) {
            $query->whereMonth('created_at', (int) $request->input('month'));
        }

        if ($request->filled('year')) {
            $query->whereYear('created_at', (int) $request->input('year'));
        }

        $paginator = $query->paginate(50);

        $items = $paginator->getCollection()->map(function (AuditLog $log) {
            $resourceName = null;

            if ($log->auditable_type !== 'auth' && $log->auditable_type !== 'App\\Models\\Auth' && class_exists($log->auditable_type)) {
                try {
                    $model = $log->auditable_type::find($log->auditable_id);
                    if ($model) {
                        $resourceName = match (true) {
                            method_exists($model, 'getName') => $model->getName(),
                            isset($model->name) => $model->name,
                            isset($model->fullName) => $model->fullName,
                            isset($model->title) => $model->title,
                            default => get_class($model).' #'.$model->getKey(),
                        };
                    }
                } catch (\Exception) {
                }
            }

            $shortType = $typeMap[$log->auditable_type] ?? class_basename($log->auditable_type);

            return [
                'id' => $log->id,
                'action' => $log->action,
                'auditableType' => $shortType,
                'resourceName' => $resourceName,
                'oldValues' => $log->old_values,
                'newValues' => $log->new_values,
                'ipAddress' => $log->ip_address,
                'userAgent' => $log->user_agent,
                'createdAt' => $log->created_at?->toISOString(),
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
            ];
        });

        $auditLogs = [
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'links' => $paginator->linkCollection()->toArray(),
            ],
        ];

        $actions = AuditLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        $types = AuditLog::query()
            ->select('auditable_type')
            ->distinct()
            ->orderBy('auditable_type')
            ->pluck('auditable_type')
            ->map(fn (string $type) => $typeMap[$type] ?? class_basename($type));

        $filterMonths = collect(range(1, 12))->map(fn (int $m): array => [
            'value' => (string) $m,
            'label' => Carbon::create(null, $m, 1)->format('F'),
        ]);

        $currentYear = (int) now()->year;
        $filterYears = range($currentYear - 5, $currentYear + 5);

        return Inertia::render('audit-logs/index', [
            'auditLogs' => $auditLogs,
            'filters' => $request->only(['action', 'auditable_type', 'user_id', 'date_from', 'date_to', 'month', 'year']),
            'actions' => $actions,
            'types' => $types,
            'filterMonths' => $filterMonths,
            'filterYears' => $filterYears,
        ]);
    }

    public function logExport(Request $request): JsonResponse
    {
        $type = $request->input('type', 'csv');
        $resource = $request->input('resource', '');
        $details = $request->input('details', []);

        $this->auditLogger->logWithoutModel("export-{$resource}-{$type}", $details);

        return response()->json(['ok' => true]);
    }
}
