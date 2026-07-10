import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Can } from '@/components/can';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { updateStatus } from '@/routes/employees';
import {
    batchDeletePath,
    breadcrumbs,
    formatDaySet,
    formatTime,
} from '../helpers/employees-page';
import type { EmployeesPageProps, EmployeeRow } from '../helpers/employees-page';
import { useEmployeeDialog } from '../hooks/use-employee-dialog';
import EmployeeDialog from './employee-dialog';

const statusColor = (status: string) => {
    switch (status) {
        case 'active':
            return 'border-transparent bg-emerald-600 text-white';
        case 'probation':
            return 'border-transparent bg-amber-500 text-white';
        case 'suspended':
            return 'border-transparent bg-orange-500 text-white';
        case 'resigned':
            return 'border-transparent bg-gray-500 text-white';
        case 'terminated':
            return 'border-transparent bg-red-600 text-white';
        case 'retired':
            return 'border-transparent bg-blue-600 text-white';
        default:
            return '';
    }
};

export default function EmployeesPageContent({
    employees,
    summary,
}: EmployeesPageProps) {
    const dialog = useEmployeeDialog();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
 next.delete(id); 
} else {
 next.add(id); 
}

            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === employees.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(employees.map((e) => e.id)));
        }
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleBatchDelete = () => {
        const ids = Array.from(selectedIds);

        if (ids.length === 0) {
return;
}

        if (!window.confirm(`Delete ${ids.length} selected employee(s)?`)) {
            return;
        }

        router.post(batchDeletePath, { ids }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                clearSelection();
                toast.success(`${ids.length} employee(s) deleted successfully.`);
            },
            onError: (errors) => {
                const messages = Object.values(errors).filter(Boolean);

                if (messages.length > 0) {
                    toast.error(messages[0]);
                }
            },
        });
    };

    const handleStatusChange = (employee: EmployeeRow, newStatus: string) => {
        router.patch(updateStatus({ employee: employee.id }).url, {
            status: newStatus,
            onSuccess: () => toast.success('Employee status updated.'),
            onError: (errors) => {
                const messages = Object.values(errors).filter(Boolean);

                if (messages.length > 0) {
                    toast.error(messages[0]);
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employees" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <Heading
                        title="Employees"
                        description="Add employee records and define fixed schedule blocks for attendance tracking."
                    />

                    <Can permission="manage-employees">
                        <Button
                            type="button"
                            onClick={dialog.openCreateEmployeeDialog}
                        >
                            Add employee
                        </Button>
                    </Can>
                </div>

                <EmployeeDialog dialog={dialog} />

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total employees</CardDescription>
                            <CardTitle className="text-3xl">
                                {summary.totalEmployees}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Employee List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedIds.size > 0 && (
                            <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-2">
                                <span className="text-sm font-medium">
                                    {selectedIds.size} selected
                                </span>
                                <div className="ml-auto flex gap-2">
                                    <Can permission="delete-employees">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleBatchDelete}
                                        >
                                            Delete Selected
                                        </Button>
                                    </Can>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearSelection}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        )}

                        {employees.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                                <p className="text-sm font-medium">
                                    No employees yet
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Click Add employee to create the first
                                    record.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground">
                                            <Can permission="delete-employees">
                                                <th className="w-10 py-3 pr-4">
                                                    <Checkbox
                                                        checked={
                                                            selectedIds.size ===
                                                                employees.length &&
                                                            employees.length > 0
                                                        }
                                                        onCheckedChange={
                                                            toggleSelectAll
                                                        }
                                                    />
                                                </th>
                                            </Can>
                                            <th className="py-3 pr-4 font-medium">
                                                Employee
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Weekly schedule
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Status
                                            </th>
                                            <Can permission="manage-employees">
                                                <th className="px-4 py-3 font-medium">
                                                    Actions
                                                </th>
                                            </Can>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {employees.map((employee) => (
                                            <tr
                                                key={employee.id}
                                                className={
                                                    selectedIds.has(
                                                        employee.id,
                                                    )
                                                        ? 'bg-muted/20'
                                                        : ''
                                                }
                                            >
                                                <Can permission="delete-employees">
                                                    <td className="w-10 py-4 pr-4 align-middle">
                                                        <Checkbox
                                                            checked={selectedIds.has(
                                                                employee.id,
                                                            )}
                                                            onCheckedChange={() =>
                                                                toggleSelect(
                                                                    employee.id,
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                </Can>
                                                <td className="py-4 pr-4 align-middle font-medium">
                                                    {employee.fullName}
                                                </td>
                                                <td className="px-4 py-4 align-middle text-muted-foreground">
                                                    <div className="space-y-1">
                                                        {employee.schedule.groups.map(
                                                            (group, index) => (
                                                                <div
                                                                    key={`${employee.id}-${index}`}
                                                                >
                                                                    {formatDaySet(
                                                                        group.days,
                                                                    )}
                                                                    :{' '}
                                                                    {formatTime(
                                                                        group.startTime,
                                                                    )}{' '}
                                                                    -{' '}
                                                                    {formatTime(
                                                                        group.endTime,
                                                                    )}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-middle">
                                                    <Badge
                                                        className={`capitalize ${statusColor(employee.status)}`}
                                                    >
                                                        {employee.status}
                                                    </Badge>
                                                </td>
                                                <Can permission="manage-employees">
                                                    <td className="px-4 py-4 align-middle">
                                                        <div className="flex flex-wrap gap-2">
                                                            <Select
                                                                value={
                                                                    employee.status
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    handleStatusChange(
                                                                        employee,
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8 w-36">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="active">
                                                                        Active
                                                                    </SelectItem>
                                                                    <SelectItem value="probation">
                                                                        Probation
                                                                    </SelectItem>
                                                                    <SelectItem value="resigned">
                                                                        Resigned
                                                                    </SelectItem>
                                                                    <SelectItem value="terminated">
                                                                        Terminated
                                                                    </SelectItem>
                                                                    <SelectItem value="suspended">
                                                                        Suspended
                                                                    </SelectItem>
                                                                    <SelectItem value="retired">
                                                                        Retired
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    dialog.openEditEmployeeDialog(
                                                                        employee,
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Can permission="delete-employees">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        dialog.deleteEmployee(
                                                                            employee,
                                                                        )
                                                                    }
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </Can>
                                                        </div>
                                                    </td>
                                                </Can>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
