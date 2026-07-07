import { index as auditLogsIndex } from '@/routes/audit-logs';
import type { BreadcrumbItem } from '@/types';

export type AuditLogRow = {
    id: number;
    action: string;
    auditableType: string;
    resourceName: string | null;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
    } | null;
};

export type FilterMonth = { value: string; label: string };

export type AuditLogsPageProps = {
    auditLogs: {
        data: AuditLogRow[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number | null;
            to: number | null;
            links: Array<{ url: string | null; label: string; active: boolean }>;
        };
    };
    filters: {
        action?: string;
        auditable_type?: string;
        user_id?: string;
        date_from?: string;
        date_to?: string;
        month?: string;
        year?: string;
    };
    actions: string[];
    types: string[];
    filterMonths: FilterMonth[];
    filterYears: string[];
};

export const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(0, i).toLocaleString('en-US', { month: 'long' }),
}));

export const yearOptions = (): string[] => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => String(current - 5 + i));
};

export const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Audit Logs',
        href: auditLogsIndex(),
    },
];

export const actionBadgeColor = (action: string) => {
    switch (action) {
        case 'created':
            return 'border-transparent bg-emerald-600 text-white';
        case 'updated':
            return 'border-transparent bg-blue-600 text-white';
        case 'deleted':
            return 'border-transparent bg-red-600 text-white';
        case 'login':
        case 'logout':
            return 'border-transparent bg-violet-600 text-white';
        case 'export-dtr-pdf':
        case 'export-dtr-pdf-batch':
        case 'export-ranking-pdf':
        case 'export-ranking-pdf-batch':
        case 'export-dtr-csv':
        case 'export-dtr-batch-csv':
        case 'export-ranking-csv':
            return 'border-transparent bg-amber-600 text-white';
        default:
            return 'border-transparent bg-gray-600 text-white';
    }
};
