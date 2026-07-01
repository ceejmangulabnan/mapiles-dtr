import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { destroy, updateStatus } from '@/routes/users';
import { breadcrumbs } from '../helpers/users-page';
import type { UsersPageProps, UserRow } from '../helpers/users-page';
import CreateUserDialog from './create-user-dialog';

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

export default function UsersPageContent({
    users,
    successMessage = null,
}: UsersPageProps) {
    const auth = useAuth();
    const isAdmin = auth.user.role === 'admin';
    const isManagement = auth.user.role === 'management';
    const canManage = isAdmin || isManagement;
    const isCurrentUser = (user: UserRow) => user.id === auth.user.id;
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const handleStatusChange = (user: UserRow, newStatus: string) => {
        router.patch(updateStatus({ user: user.id }).url, { status: newStatus });
    };

    const handleDelete = (user: UserRow) => {
        if (confirm('Are you sure you want to delete this user?')) {
            router.delete(destroy({ user: user.id }).url);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />

            <div className="flex flex-1 flex-col gap-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <Heading
                        title="Users"
                        description="Manage user accounts and their access levels."
                    />

                    {canManage && (
                        <Button
                            type="button"
                            onClick={() => setIsCreateDialogOpen(true)}
                        >
                            Add User
                        </Button>
                    )}
                </div>

                {successMessage && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                        {successMessage}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>User Accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {users.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                                <p className="text-sm font-medium">
                                    No users found
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground">
                                            <th className="py-3 pr-4 font-medium">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Role
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Status
                                            </th>
                                            {canManage && (
                                                <th className="px-4 py-3 font-medium">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="py-4 pr-4 align-top font-medium text-foreground">
                                                    {user.name}
                                                    {isCurrentUser(user) && (
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            (you)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 align-top text-muted-foreground">
                                                    {user.email}
                                                </td>
                                                <td className="px-4 py-4 align-top capitalize text-foreground">
                                                    {user.role}
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <Badge
                                                        className={`capitalize ${statusColor(user.status)}`}
                                                    >
                                                        {user.status}
                                                    </Badge>
                                                </td>
                                                {canManage && (
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Select
                                                                value={
                                                                    user.status
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    handleStatusChange(
                                                                        user,
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
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        user,
                                                                    )
                                                                }
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <CreateUserDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />
        </AppLayout>
    );
}
