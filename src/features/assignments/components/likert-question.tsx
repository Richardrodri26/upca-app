"use client";

type LikertQuestionProps = {
  number: number;
  text: string;
  value: number | null;
  onChange: (value: number) => void;
  readOnly?: boolean;
};

const LABELS = ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"];

export function LikertQuestion({
  number,
  text,
  value,
  onChange,
  readOnly = false,
}: LikertQuestionProps) {
  return (
    <div className="flex flex-col gap-3 py-4 border-b last:border-b-0">
      <p className="text-sm leading-relaxed">
        <span className="font-bold text-muted-foreground mr-2">{number}.</span>
        {text}
      </p>

      <div className="flex flex-wrap justify-between gap-1">
        {LABELS.map((label, i) => {
          const optionValue = i + 1;
          const selected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(optionValue)}
              className={`flex-1 min-w-16 flex flex-col items-center gap-1 rounded-lg border px-2 py-3 transition-colors ${
                readOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:border-primary/50"
              } ${
                selected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-muted-foreground/20 text-muted-foreground"
              }`}
            >
              <span className={`text-lg font-bold ${selected ? "text-primary" : ""}`}>
                {optionValue}
              </span>
              <span className="text-[10px] leading-tight text-center">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
