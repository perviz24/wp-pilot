import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

export function LayerCard({
  connected,
  icon: Icon,
  iconColor,
  title,
  description,
}: {
  connected: boolean;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {connected ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}
    </div>
  );
}
