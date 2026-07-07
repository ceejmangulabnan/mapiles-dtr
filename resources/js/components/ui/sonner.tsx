import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            richColors
            closeButton
            className="toaster group"
            {...props}
        />
    );
};

export { Toaster };
