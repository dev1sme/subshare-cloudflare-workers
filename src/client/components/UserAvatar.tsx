import { initials } from "../lib/initials";

export function UserAvatar({ name }: { name: string }) {
  return (
    <span
      title={name}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tertiary-container text-sm font-semibold text-on-tertiary-container"
    >
      <span aria-hidden="true">{initials(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
