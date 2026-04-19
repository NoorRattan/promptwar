import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({
  to,
  label = 'Back',
}: BackButtonProps): JSX.Element {
  const navigate = useNavigate();

  const handleClick = (): void => {
    if (to) {
      navigate(to);
      return;
    }

    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="focus-ring inline-flex items-center gap-2 bg-transparent px-0 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
