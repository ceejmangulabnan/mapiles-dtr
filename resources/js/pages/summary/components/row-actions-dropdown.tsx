import { Eye, FileDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SummaryDtr } from '../helpers/summary-page';

type RowActionsDropdownProps = {
    dtr: SummaryDtr;
    isDeleting: boolean;
    onView: () => void;
    onExportPdf: () => void;
    onExportCsv: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

export default function RowActionsDropdown({
    dtr: _dtr,
    isDeleting,
    onView,
    onExportPdf,
    onExportCsv,
    onEdit,
    onDelete,
}: RowActionsDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isDeleting}
                    className="h-8 w-8 p-0"
                >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4" />
                    View
                </DropdownMenuItem>
                <Can permission="export-dtr">
                    <DropdownMenuItem onClick={onExportPdf}>
                        <FileDown className="h-4 w-4" />
                        Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onExportCsv}>
                        <FileDown className="h-4 w-4" />
                        Export as CSV
                    </DropdownMenuItem>
                </Can>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-600"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
