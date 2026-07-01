import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { store as createUserRoute } from '@/routes/users';

type CreateUserDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function CreateUserDialog({
    open,
    onOpenChange,
}: CreateUserDialogProps) {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'employee',
        status: 'active',
    });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        form.post(createUserRoute().url, {
            preserveState: false,
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add User</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="name" className="w-32 shrink-0 text-right">
                            Name
                        </Label>
                        <div className="flex-1">
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                            />
                            <InputError message={form.errors.name} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Label htmlFor="email" className="w-32 shrink-0 text-right">
                            Email
                        </Label>
                        <div className="flex-1">
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                            />
                            <InputError message={form.errors.email} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Label htmlFor="password" className="w-32 shrink-0 text-right">
                            Password
                        </Label>
                        <div className="flex-1">
                            <Input
                                id="password"
                                type="password"
                                value={form.data.password}
                                onChange={(e) =>
                                    form.setData('password', e.target.value)
                                }
                            />
                            <InputError message={form.errors.password} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Label htmlFor="password_confirmation" className="w-32 shrink-0 text-right">
                            Confirm Password
                        </Label>
                        <div className="flex-1">
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={form.data.password_confirmation}
                                onChange={(e) =>
                                    form.setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Label htmlFor="role" className="w-32 shrink-0 text-right">
                            Role
                        </Label>
                        <div className="flex-1">
                            <Select
                                value={form.data.role}
                                onValueChange={(value) =>
                                    form.setData('role', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="management">
                                        Management
                                    </SelectItem>
                                    <SelectItem value="employee">
                                        Employee
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.role} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Label htmlFor="status" className="w-32 shrink-0 text-right">
                            Status
                        </Label>
                        <div className="flex-1">
                            <Select
                                value={form.data.status}
                                onValueChange={(value) =>
                                    form.setData('status', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
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
                                    <SelectItem value="retired">Retired</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.status} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Create User
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
