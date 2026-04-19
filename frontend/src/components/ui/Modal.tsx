import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS_MAP: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps): JSX.Element {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-[140] bg-[var(--color-bg-overlay)] backdrop-blur-sm" />
        <Dialog.Content
          className={`animate-page-enter focus-ring fixed left-1/2 top-1/2 z-[150] w-[calc(100%-24px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-[0_28px_64px_rgba(2,6,23,0.5)] ${SIZE_CLASS_MAP[size]}`}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Dialog.Title className="text-title">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description id="modal-description" className="text-meta">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
