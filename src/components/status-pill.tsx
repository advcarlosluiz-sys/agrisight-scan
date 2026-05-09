export const STATUS_LABEL: Record<string, string> = {
  normal: "Normal",
  atencao: "Atenção",
  critico: "Crítico",
};

export const STATUS_CLASS: Record<string, string> = {
  normal: "status-normal",
  atencao: "status-atencao",
  critico: "status-critico",
};

export const STATUS_DOT: Record<string, string> = {
  normal: "bg-success",
  atencao: "bg-warning",
  critico: "bg-destructive",
};

export function StatusPill({ status }: { status?: string | null }) {
  const key = status ?? "vazio";
  const label = key === "vazio" ? "Não vistoriado" : STATUS_LABEL[key] ?? key;
  const cls = key === "vazio" ? "status-vazio" : STATUS_CLASS[key];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
