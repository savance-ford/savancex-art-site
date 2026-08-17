interface OverlayBackdropProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function OverlayBackdrop({
  isOpen,
  onClose,
}: OverlayBackdropProps) {
  return (
    <div
      className={`overlay${isOpen ? " is-open" : ""}`}
      data-action="close-overlay"
      aria-hidden="true"
      onClick={onClose}
    />
  );
}
