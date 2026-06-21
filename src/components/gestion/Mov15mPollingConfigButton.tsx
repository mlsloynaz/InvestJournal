"use client";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  variant?: "inside" | "outside";
};

const VARIANT_CLASS = {
  inside: "border-violet-400 text-violet-900 bg-violet-50 hover:bg-violet-100",
  outside: "border-amber-500 text-amber-900 bg-amber-50 hover:bg-amber-100",
} as const;

export function Mov15mPollingConfigButton({
  onClick,
  disabled = false,
  variant = "inside",
}: Props) {
  return (
    <button
      type="button"
      className={`text-[10px] p-1.5 rounded border disabled:opacity-50 inline-flex items-center justify-center ${VARIANT_CLASS[variant]}`}
      onClick={onClick}
      disabled={disabled}
      title="Config Polling"
      aria-label="Config Polling"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3.5 h-3.5"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l.68 1.178a1 1 0 01-.12 1.198l-1.27 1.27a7.04 7.04 0 010 2.3l1.27 1.27a1 1 0 01.12 1.198l-.68 1.178a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.331 1.652a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-.68-1.178a1 1 0 01.12-1.198l1.27-1.27a7.04 7.04 0 010-2.3l-1.27-1.27a1 1 0 01-.12-1.198l.68-1.178a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 018.01 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
