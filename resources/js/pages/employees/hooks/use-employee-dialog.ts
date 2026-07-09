import { router, useForm } from '@inertiajs/react';
import type { SubmitEventHandler, SubmitEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { store as employeesStore } from '@/routes/employees';
import {
    createScheduleGroup,
    defaultEmployeeFormData,
    employeePath,
    employeeToFormData,
    getDerivedRates,
} from '../helpers/employees-page';
import type {
    EmployeeFormData,
    EmployeeRow,
    ScheduleGroupForm,
} from '../helpers/employees-page';

export function useEmployeeDialog() {
    const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(
        null,
    );
    const form = useForm<EmployeeFormData>(defaultEmployeeFormData());
    const errors = form.errors as Record<string, string | undefined>;
    const isEditingEmployee = editingEmployee !== null;
    const computedRates = getDerivedRates(form.data.monthly_rate);

    const resetEmployeeForm = () => {
        setEditingEmployee(null);
        form.setData(defaultEmployeeFormData());
        form.clearErrors();
    };

    const openCreateEmployeeDialog = () => {
        resetEmployeeForm();
        setIsEmployeeDialogOpen(true);
    };

    const openEditEmployeeDialog = (employee: EmployeeRow) => {
        setEditingEmployee(employee);
        form.setData(employeeToFormData(employee));
        form.clearErrors();
        setIsEmployeeDialogOpen(true);
    };

    const handleEmployeeDialogChange = (open: boolean) => {
        setIsEmployeeDialogOpen(open);

        if (!open) {
            resetEmployeeForm();
        }
    };

    const updateScheduleGroup = <K extends keyof ScheduleGroupForm>(
        index: number,
        field: K,
        value: ScheduleGroupForm[K],
    ) => {
        form.setData(
            'schedule_groups',
            form.data.schedule_groups.map((group, currentIndex) =>
                currentIndex === index ? { ...group, [field]: value } : group,
            ),
        );
    };

    const toggleGroupDay = (index: number, day: number, checked: boolean) => {
        const group = form.data.schedule_groups[index];
        const nextDays = checked
            ? [...group.days, day]
            : group.days.filter((selectedDay) => selectedDay !== day);

        updateScheduleGroup(
            index,
            'days',
            [...new Set(nextDays)].sort((left, right) => left - right),
        );
    };

    const addScheduleGroup = () => {
        form.setData('schedule_groups', [
            ...form.data.schedule_groups,
            createScheduleGroup(),
        ]);
    };

    const removeScheduleGroup = (index: number) => {
        if (form.data.schedule_groups.length === 1) {
            return;
        }

        form.setData(
            'schedule_groups',
            form.data.schedule_groups.filter(
                (_, currentIndex) => currentIndex !== index,
            ),
        );
    };

    const dayIsUsedElsewhere = (groupIndex: number, day: number) =>
        form.data.schedule_groups.some(
            (group, currentIndex) =>
                currentIndex !== groupIndex && group.days.includes(day),
        );

    const groupDayError = (index: number) =>
        errors[`schedule_groups.${index}.days`] ??
        errors[`schedule_groups.${index}.days.0`];

    const groupFieldError = (index: number, field: 'start_time' | 'end_time') =>
        errors[`schedule_groups.${index}.${field}`];

    const submit: SubmitEventHandler = (event: SubmitEvent) => {
        event.preventDefault();

        const onSuccess = () => {
            setIsEmployeeDialogOpen(false);
            resetEmployeeForm();
            toast.success(
                editingEmployee
                    ? 'Employee updated successfully.'
                    : 'Employee added successfully.',
            );
        };

        const onError = (errors: Record<string, string>) => {
            const messages = Object.values(errors).filter(Boolean);
            if (messages.length > 0) {
                toast.error(messages[0], {
                    description:
                        messages.length > 1
                            ? `${messages.length - 1} more error(s)`
                            : undefined,
                });
            }
        };

        if (editingEmployee) {
            form.put(employeePath(editingEmployee.id), {
                preserveScroll: true,
                preserveState: false,
                onSuccess,
                onError,
            });

            return;
        }

        form.post(employeesStore.url(), {
            preserveScroll: true,
            preserveState: false,
            onSuccess,
            onError,
        });
    };

    const deleteEmployee = (employee: EmployeeRow) => {
        if (!window.confirm(`Delete ${employee.fullName}?`)) {
            return;
        }

        router.delete(employeePath(employee.id), {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => toast.success('Employee deleted successfully.'),
            onError: (errors) => {
                const messages = Object.values(errors).filter(Boolean);
                if (messages.length > 0) {
                    toast.error(messages[0]);
                }
            },
        });
    };

    return {
        computedRates,
        deleteEmployee,
        errors,
        form,
        groupDayError,
        groupFieldError,
        handleEmployeeDialogChange,
        isEditingEmployee,
        isEmployeeDialogOpen,
        openCreateEmployeeDialog,
        openEditEmployeeDialog,
        addScheduleGroup,
        removeScheduleGroup,
        submit,
        toggleGroupDay,
        updateScheduleGroup,
        dayIsUsedElsewhere,
    };
}

export type EmployeeDialogController = ReturnType<typeof useEmployeeDialog>;
