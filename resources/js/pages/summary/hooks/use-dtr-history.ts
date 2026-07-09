import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { useState } from 'react';
import { index as calculateIndex } from '@/routes/calculate';
import {
    buildOvertimeSummary,
    formatRateAmount,
    formatWorkedDuration,
    getHolidayLabel,
} from '../../calculate/helpers/calculate-page';
import {
    dtrExportPath,
    dtrPath,
    formatConfirmedAt
    
} from '../helpers/summary-page';
import type {SummaryDtr} from '../helpers/summary-page';

function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
}

function logCsvExport(resource: string, details: Record<string, unknown> = {}) {
    const tokenEl = document.querySelector('meta[name=csrf-token]');
    const token = tokenEl?.getAttribute('content') || '';

    fetch('/audit-logs/log-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
        body: JSON.stringify({ type: 'csv', resource, details }),
    }).catch(() => {});
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function useDtrHistory(dtrs: SummaryDtr[]) {
    const [selectedDtr, setSelectedDtr] = useState<SummaryDtr | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [deletingDtrId, setDeletingDtrId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === dtrs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(dtrs.map((d) => d.id)));
        }
    };

    const clearSelection = () => setSelectedIds(new Set());

    const selectionCount = selectedIds.size;
    const isAllSelected = selectionCount === dtrs.length && dtrs.length > 0;

    const overview = {
        totalDtrs: dtrs.length,
        totalWorkedDuration: formatWorkedDuration(
            dtrs.reduce((total, dtr) => total + dtr.totalWorkedMinutes, 0),
        ),
        totalAmountLabel: formatRateAmount(
            dtrs.reduce((total, dtr) => total + Number(dtr.totalAmount), 0),
        ),
    };

    const openDtr = (dtr: SummaryDtr) => {
        setSelectedDtr(dtr);
        setIsDetailsDialogOpen(true);
    };

    const handleDetailsDialogChange = (open: boolean) => {
        setIsDetailsDialogOpen(open);

        if (!open) {
            setSelectedDtr(null);
        }
    };

    const reopenDtr = (dtr: SummaryDtr) => {
        router.visit(
            calculateIndex.url({
                query: {
                    employee: dtr.employeeId,
                    month: dtr.month,
                    year: dtr.year,
                    source: 'summary',
                },
            }),
        );
    };

    const deleteDtr = (dtr: SummaryDtr) => {
        if (deletingDtrId === dtr.id) {
            return;
        }

        if (
            !window.confirm(
                `Delete the saved DTR for ${dtr.employeeName} (${dtr.monthLabel} ${dtr.year})?`,
            )
        ) {
            return;
        }

        setDeletingDtrId(dtr.id);

        router.delete(dtrPath(dtr.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedDtr?.id === dtr.id) {
                    handleDetailsDialogChange(false);
                }
                toast.success('DTR deleted successfully.');
            },
            onError: (errors) => {
                const messages = Object.values(errors).filter(Boolean);
                if (messages.length > 0) {
                    toast.error(messages[0]);
                }
            },
            onFinish: () => {
                setDeletingDtrId((current) =>
                    current === dtr.id ? null : current,
                );
            },
        });
    };

    const exportDtrAsPdf = (dtr: SummaryDtr) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = dtrExportPath(dtr.id);
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 60000);
    };

    const exportSelectedAsPdf = () => {
        const ids = dtrs.filter((d) => selectedIds.has(d.id)).map((d) => d.id);
        if (ids.length === 0) return;

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/summary/batch-export';
        form.style.display = 'none';

        const token = document.createElement('input');
        token.name = '_token';
        token.value = document.querySelector('meta[name=csrf-token]')?.getAttribute('content') || '';
        form.appendChild(token);

        ids.forEach((id) => {
            const input = document.createElement('input');
            input.name = 'ids[]';
            input.value = id;
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        setTimeout(() => document.body.removeChild(form), 1000);
    };

    const exportSelectedAsCsv = () => {
        const selected = dtrs.filter((d) => selectedIds.has(d.id));
        if (selected.length === 0) return;

        const allMetaRows: Record<string, string>[] = [];
        const allSummaryRows: Record<string, string>[] = [];
        const allEntryRows: Record<string, string>[] = [];

        selected.forEach((dtr) => {
            allMetaRows.push(
                { key: 'Employee', value: dtr.employeeName },
                { key: 'Period', value: `${dtr.monthLabel} ${dtr.year}` },
                { key: '', value: '' },
            );
            allSummaryRows.push({
                Employee: dtr.employeeName,
                Period: `${dtr.monthLabel} ${dtr.year}`,
                'Total Days': String(dtr.totalDays),
                'Total Hours': formatWorkedDuration(dtr.totalWorkedMinutes),
                'Regular Pay': formatRateAmount(dtr.regularAmount),
                'Overtime Pay': formatRateAmount(dtr.totalOvertimeAmount),
                'SSS Deduction': formatRateAmount(dtr.sssDeduction),
                'Pag-IBIG Deduction': formatRateAmount(dtr.pagibigDeduction),
                'Net Pay': formatRateAmount(dtr.totalAmount),
            });
            dtr.entries.forEach((entry) => {
                allEntryRows.push({
                    Employee: dtr.employeeName,
                    Period: `${dtr.monthLabel} ${dtr.year}`,
                    Date: entry.label,
                    Day: entry.weekday,
                    'Time In': entry.timeIn || '--',
                    'Time Out': entry.timeOut || '--',
                    Holiday: getHolidayLabel(entry.holidayType),
                    Hours: formatWorkedDuration(entry.workedMinutes),
                    Rate: formatRateAmount(entry.rate || '0'),
                });
            });
        });

        const metaCsv = Papa.unparse(allMetaRows);
        const summaryCsv = Papa.unparse(allSummaryRows);
        const entriesCsv = Papa.unparse(allEntryRows);
        const csv = `${metaCsv}\n\n${summaryCsv}\n\n${entriesCsv}`;

        const filename = `dtr-batch-${new Date().toISOString().slice(0, 10)}.csv`;
        downloadCsv(filename, csv);

        logCsvExport('dtr-batch', { count: selected.length });
    };

    const exportDtrAsCsv = (dtr: SummaryDtr) => {
        const filename = `dtr-${dtr.employeeName.replace(/\s+/g, '-').toLowerCase()}-${dtr.year}-${String(dtr.month).padStart(2, '0')}.csv`;

        const metaRows = [
            { key: 'Employee', value: dtr.employeeName },
            { key: 'Period', value: `${dtr.monthLabel} ${dtr.year}` },
        ];

        const summaryRows = [{
            'Total Days': dtr.totalDays,
            'Total Hours': formatWorkedDuration(dtr.totalWorkedMinutes),
            'Regular Pay': formatRateAmount(dtr.regularAmount),
            'Overtime Pay': formatRateAmount(dtr.totalOvertimeAmount),
            'SSS Deduction': formatRateAmount(dtr.sssDeduction),
            'Pag-IBIG Deduction': formatRateAmount(dtr.pagibigDeduction),
            'Net Pay': formatRateAmount(dtr.totalAmount),
        }];

        const entryRows = dtr.entries.map((entry) => ({
            Date: entry.label,
            Day: entry.weekday,
            'Time In': entry.timeIn || '--',
            'Time Out': entry.timeOut || '--',
            Holiday: getHolidayLabel(entry.holidayType),
            Hours: formatWorkedDuration(entry.workedMinutes),
            Rate: formatRateAmount(entry.rate || '0'),
        }));

        const metaCsv = Papa.unparse(metaRows);
        const summaryCsv = Papa.unparse(summaryRows);
        const entriesCsv = Papa.unparse(entryRows);
        const csv = `${metaCsv}\n\n${summaryCsv}\n\n${entriesCsv}`;

        downloadCsv(filename, csv);

        logCsvExport('dtr', { employeeId: dtr.employeeId, period: `${dtr.monthLabel} ${dtr.year}` });
    };

    const printDtr = (dtr: SummaryDtr) => {
        const printWindow = window.open(
            '',
            '_blank',
            'noopener,noreferrer,width=960,height=720',
        );

        if (!printWindow) {
            return;
        }

        const overtime = buildOvertimeSummary(
            dtr.totalOvertimeMinutes,
            dtr.dailyRateBasis,
        );
        const rows = dtr.entries
            .map(
                (entry) => `
                    <tr>
                        <td>${escapeHtml(entry.label)}</td>
                        <td>${escapeHtml(entry.weekday)}</td>
                        <td>${escapeHtml(entry.timeIn || '--')}</td>
                        <td>${escapeHtml(entry.timeOut || '--')}</td>
                        <td>${escapeHtml(getHolidayLabel(entry.holidayType))}</td>
                        <td>${escapeHtml(formatWorkedDuration(entry.workedMinutes))}</td>
                        <td>${escapeHtml(formatRateAmount(entry.rate || '0'))}</td>
                    </tr>
                `,
            )
            .join('');

        const logoUrl = `${window.location.origin}/mapiles-icon.png`;

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <title>DTR Summary</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                        .header-left { flex: 1; }
                        .logo { position: fixed; top: 24px; right: 24px; width: 80px; height: auto; }
                        h1 { margin: 0 0 4px; }
                        p { margin: 2px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
                        th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 14px; }
                        th { background: #f3f4f6; }
                        .meta { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 20px; }
                        .meta-card { border: 1px solid #d1d5db; padding: 12px; border-radius: 8px; }
                        .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
                        .value { margin-top: 6px; font-weight: 600; }
                        .note { margin-top: 16px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="header-left">
                            <h1>DTR Summary</h1>
                            <p><strong>Employee:</strong> ${escapeHtml(dtr.employeeName)}</p>
                            <p><strong>Period:</strong> ${escapeHtml(`${dtr.monthLabel} ${dtr.year}`)}</p>
                            <p><strong>Confirmed at:</strong> ${escapeHtml(formatConfirmedAt(dtr.confirmedAt))}</p>
                        </div>
                        <img src="${escapeHtml(logoUrl)}" alt="Mapiles Logo" class="logo">
                    </div>
                    <div class="meta">
                        <div class="meta-card">
                            <div class="label">Workdays</div>
                            <div class="value">${dtr.totalDays}</div>
                        </div>
                        <div class="meta-card">
                            <div class="label">Total hours</div>
                            <div class="value">${escapeHtml(formatWorkedDuration(dtr.totalWorkedMinutes))}</div>
                        </div>
                        <div class="meta-card">
                            <div class="label">Regular pay</div>
                            <div class="value">${escapeHtml(formatRateAmount(dtr.regularAmount))}</div>
                        </div>
                        <div class="meta-card">
                            <div class="label">Overtime pay</div>
                            <div class="value">${escapeHtml(formatRateAmount(dtr.totalOvertimeAmount))}</div>
                        </div>
                        <div class="meta-card" style="color:#dc2626;">
                            <div class="label">SSS deduction</div>
                            <div class="value">${escapeHtml(formatRateAmount(dtr.sssDeduction))}</div>
                        </div>
                        <div class="meta-card" style="color:#dc2626;">
                            <div class="label">Pag-IBIG deduction</div>
                            <div class="value">${escapeHtml(formatRateAmount(dtr.pagibigDeduction))}</div>
                        </div>
                        <div class="meta-card">
                            <div class="label">Total pay</div>
                            <div class="value">${escapeHtml(formatRateAmount(dtr.totalAmount))}</div>
                        </div>
                    </div>
                    <div class="note">
                        <strong>Overtime computation:</strong> ${escapeHtml(overtime.formulaLabel)}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Time in</th>
                                <th>Time out</th>
                                <th>Holiday</th>
                                <th>Hours</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return {
        clearSelection,
        deleteDtr,
        deletingDtrId,
        exportDtrAsCsv,
        exportDtrAsPdf,
        exportSelectedAsCsv,
        exportSelectedAsPdf,
        handleDetailsDialogChange,
        isAllSelected,
        isDetailsDialogOpen,
        openDtr,
        overview,
        printDtr,
        reopenDtr,
        selectedDtr,
        selectedIds,
        selectionCount,
        toggleSelect,
        toggleSelectAll,
    };
}

export type DtrHistoryController = ReturnType<typeof useDtrHistory>;
