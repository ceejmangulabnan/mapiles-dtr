import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { index as auditLogsIndex } from '@/routes/audit-logs';
import {
    actionBadgeColor,
    breadcrumbs,
    monthOptions,
    yearOptions,
} from '../helpers/audit-logs-page';
import type { AuditLogsPageProps, AuditLogRow } from '../helpers/audit-logs-page';

export default function AuditLogsPageContent() {
    const { auditLogs, filters, actions, types, filterMonths, filterYears } = usePage<AuditLogsPageProps>().props;
    const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

    const applyFilter = (key: string, value: string) => {
        const cleaned = value === 'all' ? undefined : value;
        router.get(
            auditLogsIndex.url({
                query: { ...filters, [key]: cleaned },
            }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const goToPage = (url: string | null) => {
        if (url) {
            router.get(url, {}, { preserveState: true, preserveScroll: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Logs" />

            <div className="flex flex-1 flex-col gap-6 p-5 md:p-6">
                <Heading
                    title="Audit Logs"
                    description="Review all actions performed across the system."
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Audit Log Filters</CardTitle>
                        <CardDescription>
                            Filter by action, resource type, month, year, or
                            date range to narrow down audit entries.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="audit-action">Action</Label>
                                <Select
                                    value={filters.action ?? 'all'}
                                    onValueChange={(value) =>
                                        applyFilter('action', value)
                                    }
                                >
                                    <SelectTrigger id="audit-action" className="w-full">
                                        <SelectValue placeholder="All actions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All actions</SelectItem>
                                        {actions.map((action) => (
                                            <SelectItem key={action} value={action}>
                                                {action}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="audit-type">Type</Label>
                                <Select
                                    value={filters.auditable_type ?? 'all'}
                                    onValueChange={(value) =>
                                        applyFilter('auditable_type', value)
                                    }
                                >
                                    <SelectTrigger id="audit-type" className="w-full">
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        {types.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="audit-month">Month</Label>
                                <Select
                                    value={filters.month ?? 'all'}
                                    onValueChange={(value) =>
                                        applyFilter('month', value)
                                    }
                                >
                                    <SelectTrigger id="audit-month" className="w-full">
                                        <SelectValue placeholder="All months" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All months</SelectItem>
                                        {filterMonths.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="audit-year">Year</Label>
                                <Select
                                    value={filters.year ?? 'all'}
                                    onValueChange={(value) =>
                                        applyFilter('year', value)
                                    }
                                >
                                    <SelectTrigger id="audit-year" className="w-full">
                                        <SelectValue placeholder="All years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All years</SelectItem>
                                        {filterYears.map((y) => (
                                            <SelectItem key={y} value={y}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="audit-date-from">Date from</Label>
                                <Input
                                    id="audit-date-from"
                                    type="date"
                                    value={filters.date_from ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value || undefined;
                                        router.get(
                                            auditLogsIndex.url({
                                                query: { ...filters, date_from: val },
                                            }),
                                            {},
                                            { preserveState: true, preserveScroll: true },
                                        );
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="audit-date-to">Date to</Label>
                                <Input
                                    id="audit-date-to"
                                    type="date"
                                    value={filters.date_to ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value || undefined;
                                        router.get(
                                            auditLogsIndex.url({
                                                query: { ...filters, date_to: val },
                                            }),
                                            {},
                                            { preserveState: true, preserveScroll: true },
                                        );
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {auditLogs.data.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                                <p className="text-sm font-medium">
                                    No audit logs found
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-[480px] overflow-auto">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead className="sticky top-0 bg-card">
                                        <tr className="text-left text-muted-foreground">
                                            <th className="py-3 pr-4 font-medium">When</th>
                                            <th className="px-4 py-3 font-medium">User</th>
                                            <th className="px-4 py-3 font-medium">Action</th>
                                            <th className="px-4 py-3 font-medium">Resource</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {auditLogs.data.map((log) => (
                                            <tr
                                                key={log.id}
                                                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                                                    selectedLog?.id === log.id
                                                        ? 'bg-muted'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    setSelectedLog(
                                                        selectedLog?.id === log.id
                                                            ? null
                                                            : log,
                                                    )
                                                }
                                            >
                                                <td className="py-3 pr-4 align-middle whitespace-nowrap text-muted-foreground">
                                                    {new Date(
                                                        log.createdAt,
                                                    ).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 align-middle whitespace-nowrap">
                                                    {log.user?.name ?? (
                                                        <span className="text-muted-foreground italic">
                                                            System
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 align-middle whitespace-nowrap">
                                                    <Badge
                                                        className={`capitalize ${actionBadgeColor(log.action)}`}
                                                    >
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 align-middle whitespace-nowrap">
                                                    <span className="font-medium">
                                                        {log.auditableType}
                                                    </span>
                                                    {log.resourceName && (
                                                        <span className="ml-1 text-muted-foreground">
                                                            — {log.resourceName}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {auditLogs.meta.total > auditLogs.meta.per_page && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {auditLogs.meta.from} to{' '}
                                            {auditLogs.meta.to} of{' '}
                                            {auditLogs.meta.total}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    auditLogs.meta.current_page === 1
                                                }
                                                onClick={() =>
                                                    goToPage(
                                                        auditLogs.meta.links[0]?.url,
                                                    )
                                                }
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    auditLogs.meta.current_page ===
                                                    auditLogs.meta.last_page
                                                }
                                                onClick={() =>
                                                    goToPage(
                                                        auditLogs.meta.links[
                                                            auditLogs.meta.links
                                                                .length - 1
                                                        ]?.url,
                                                    )
                                                }
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedLog ? (
                            <p className="text-sm text-muted-foreground">
                                Select an audit entry to view details.
                            </p>
                        ) : (
                            <div className="space-y-4 text-sm">
                                <div>
                                    <span className="font-medium">Timestamp</span>
                                    <p className="text-muted-foreground">
                                        {new Date(
                                            selectedLog.createdAt,
                                        ).toLocaleString()}
                                    </p>
                                </div>

                                <div>
                                    <span className="font-medium">IP Address</span>
                                    <p className="text-muted-foreground font-mono">
                                        {selectedLog.ipAddress ?? '-'}
                                    </p>
                                </div>

                                <div>
                                    <span className="font-medium">User Agent</span>
                                    <p className="text-muted-foreground break-words text-xs">
                                        {selectedLog.userAgent ?? '-'}
                                    </p>
                                </div>

                                {selectedLog.oldValues &&
                                    Object.keys(selectedLog.oldValues).length > 0 && (
                                        <div>
                                            <span className="font-medium">
                                                Previous Values
                                            </span>
                                            <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                                                {JSON.stringify(
                                                    selectedLog.oldValues,
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </div>
                                    )}

                                {selectedLog.newValues &&
                                    Object.keys(selectedLog.newValues).length > 0 && (
                                        <div>
                                            <span className="font-medium">
                                                New Values
                                            </span>
                                            <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                                                {JSON.stringify(
                                                    selectedLog.newValues,
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </div>
                                    )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
