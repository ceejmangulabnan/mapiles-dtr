import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import {
    breadcrumbs,
    formatDaySet,
    formatTime,
} from '../helpers/employees-page';
import type { EmployeesPageProps } from '../helpers/employees-page';
import { useEmployeeDialog } from '../hooks/use-employee-dialog';
import EmployeeDialog from './employee-dialog';

export default function EmployeesPageContent({
    successMessage = null,
    errorMessage = null,
    employees,
    summary,
}: EmployeesPageProps) {
    const dialog = useEmployeeDialog();

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

                {successMessage && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                        {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                        {errorMessage}
                    </div>
                )}

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
                                            <th className="py-3 pr-4 font-medium">
                                                Employee
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Weekly schedule
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
                                            <tr key={employee.id}>
                                                <td className="py-4 pr-4 align-top font-medium">
                                                    {employee.fullName}
                                                </td>
                                                <td className="px-4 py-4 align-top text-muted-foreground">
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
                                                <Can permission="manage-employees">
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="flex flex-wrap gap-2">
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
