import { Head } from '@inertiajs/react';
import { FileDown } from 'lucide-react';
import { Can } from '@/components/can';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import {
    formatRateAmount,
    formatWorkedDuration,
} from '../../calculate/helpers/calculate-page';
import {
    breadcrumbs,
    formatConfirmedAt
} from '../helpers/summary-page';
import type {SummaryPageProps} from '../helpers/summary-page';
import { useDtrHistory } from '../hooks/use-dtr-history';
import DtrDetailsDialog from './dtr-details-dialog';
import RowActionsDropdown from './row-actions-dropdown';

export default function SummaryPageContent({
    dtrs,
}: SummaryPageProps) {
    const history = useDtrHistory(dtrs);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Summary" />

            <div className="flex flex-1 flex-col gap-6 p-5 md:p-6">
                <Heading
                    title="Summary"
                    description="Review previously confirmed DTRs, reopen them for editing, download them as PDF, or remove them."
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Confirmed DTR History</CardTitle>
                        <CardDescription>
                            Open any saved DTR to review the full details,
                            export or print it, or delete it when no longer
                            needed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dtrs.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                                <p className="text-sm font-medium">
                                    No confirmed DTRs yet
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Confirm a DTR from the Calculate page and it
                                    will appear here.
                                </p>
                            </div>
                        ) : (
                            <>
                                {history.selectionCount > 0 && (
                                    <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-2">
                                        <span className="text-sm font-medium">
                                            {history.selectionCount} selected
                                        </span>
                                        <div className="ml-auto flex gap-2">
                                            <Can permission="export-dtr">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button type="button" variant="outline" size="sm" className="border-black dark:border-white">
                                                            <FileDown className="h-4 w-4" />
                                                            Export Selected
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={history.exportSelectedAsPdf}>
                                                            <FileDown className="h-4 w-4" />
                                                            Export as PDF
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={history.exportSelectedAsCsv}>
                                                            <FileDown className="h-4 w-4" />
                                                            Export as CSV
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </Can>
                                            <Can permission="delete-dtr">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={history.handleBatchDelete}
                                                >
                                                    Delete Selected
                                                </Button>
                                            </Can>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => history.clearSelection()}>
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="hidden md:block">
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-muted/30 text-left text-muted-foreground">
                                                <tr>
                                                    <th className="w-10 px-2 py-3">
                                                        <Checkbox
                                                            checked={history.isAllSelected}
                                                            onCheckedChange={history.toggleSelectAll}
                                                        />
                                                    </th>
                                                    <th className="px-4 py-3 font-medium">
                                                        Employee
                                                    </th>
                                                    <th className="px-3 py-3 font-medium">
                                                        Period
                                                    </th>
                                                    <th className="px-3 py-3 font-medium">
                                                        Confirmed
                                                    </th>
                                                    <th className="px-3 py-3 font-medium">
                                                        Days
                                                    </th>
                                                    <th className="px-3 py-3 font-medium">
                                                        Hours
                                                    </th>
                                                    <th className="px-3 py-3 font-medium">
                                                        Total pay
                                                    </th>
                                                    <th className="px-3 py-3 font-medium">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dtrs.map((dtr) => {
                                                    const isDeleting =
                                                        history.deletingDtrId ===
                                                        dtr.id;

                                                    return (
                                                        <tr
                                                            key={dtr.id}
                                                            className="border-b align-middle last:border-b-0 odd:bg-muted/10"
                                                        >
                                                            <td className="w-10 px-2 py-3">
                                                                <Checkbox
                                                                    checked={history.selectedIds.has(dtr.id)}
                                                                    onCheckedChange={() => history.toggleSelect(dtr.id)}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-foreground">
                                                                {
                                                                    dtr.employeeName
                                                                }
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                {dtr.monthLabel}{' '}
                                                                {dtr.year}
                                                            </td>
                                                            <td className="px-3 py-3 text-muted-foreground">
                                                                {formatConfirmedAt(
                                                                    dtr.confirmedAt,
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                {dtr.totalDays}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                {formatWorkedDuration(
                                                                    dtr.totalWorkedMinutes,
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                {formatRateAmount(
                                                                    dtr.totalAmount,
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <RowActionsDropdown
                                                                    dtr={dtr}
                                                                    isDeleting={isDeleting}
                                                                    onView={() =>
                                                                        history.openDtr(
                                                                            dtr,
                                                                        )
                                                                    }
                                                                    onExportPdf={() =>
                                                                        history.exportDtrAsPdf(
                                                                            dtr,
                                                                        )
                                                                    }
                                                                    onExportCsv={() =>
                                                                        history.exportDtrAsCsv(
                                                                            dtr,
                                                                        )
                                                                    }
                                                                    onEdit={() =>
                                                                        history.reopenDtr(
                                                                            dtr,
                                                                        )
                                                                    }
                                                                    onDelete={() =>
                                                                        history.deleteDtr(
                                                                            dtr,
                                                                        )
                                                                    }
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="space-y-3 md:hidden">
                                    {dtrs.map((dtr) => {
                                        const isDeleting =
                                            history.deletingDtrId === dtr.id;

                                        return (
                                            <div
                                                key={dtr.id}
                                                className="rounded-lg border p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox
                                                                checked={history.selectedIds.has(dtr.id)}
                                                                onCheckedChange={() => history.toggleSelect(dtr.id)}
                                                            />
                                                            <p className="font-medium text-foreground">
                                                                {dtr.employeeName}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {dtr.monthLabel}{' '}
                                                            {dtr.year}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Confirmed{' '}
                                                            {formatConfirmedAt(
                                                                dtr.confirmedAt,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                                                    <div>
                                                        <p className="text-muted-foreground">
                                                            Days
                                                        </p>
                                                        <p className="font-medium text-foreground">
                                                            {dtr.totalDays}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">
                                                            Hours
                                                        </p>
                                                        <p className="font-medium text-foreground">
                                                            {formatWorkedDuration(
                                                                dtr.totalWorkedMinutes,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">
                                                            Total pay
                                                        </p>
                                                        <p className="font-medium text-foreground">
                                                            {formatRateAmount(
                                                                dtr.totalAmount,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex justify-end">
                                                    <RowActionsDropdown
                                                        dtr={dtr}
                                                        isDeleting={isDeleting}
                                                        onView={() =>
                                                            history.openDtr(dtr)
                                                        }
                                                        onExportPdf={() =>
                                                            history.exportDtrAsPdf(
                                                                dtr,
                                                            )
                                                        }
                                                        onExportCsv={() =>
                                                            history.exportDtrAsCsv(
                                                                dtr,
                                                            )
                                                        }
                                                        onEdit={() =>
                                                            history.reopenDtr(dtr)
                                                        }
                                                        onDelete={() =>
                                                            history.deleteDtr(dtr)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <DtrDetailsDialog
                    dtr={history.selectedDtr}
                    deletingId={history.deletingDtrId}
                    open={history.isDetailsDialogOpen}
                    onDelete={history.deleteDtr}
                    onExportPdf={history.exportDtrAsPdf}
                    onExportCsv={history.exportDtrAsCsv}
                    onOpenChange={history.handleDetailsDialogChange}
                    onPrint={history.printDtr}
                    onReopen={history.reopenDtr}
                />
            </div>
        </AppLayout>
    );
}
