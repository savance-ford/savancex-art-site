import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "light" | "outline" | "accent";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly wide?: boolean;
}

export function Button({
  className,
  variant = "default",
  wide = false,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "btn",
    variant !== "default" ? `btn--${variant}` : "",
    wide ? "btn--wide" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <button {...props} type={type} className={classes} />;
}
