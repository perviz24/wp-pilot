export type RiskLevel = "safe" | "medium" | "high" | "blocked" | "critical";

// Files that should NEVER be editable via WP Pilot
const BLOCKED_PATTERNS = [
  /^wp-config\.php$/,
  /^\.htaccess$/,
  /^wp-includes\//,
  /^wp-admin\//,
  /^wp-content\/debug\.log$/,
];

// Files requiring extra caution
const HIGH_RISK_PATTERNS = [
  /^wp-content\/themes\/.*\/functions\.php$/,
  /^wp-content\/plugins\//,
  /^wp-content\/mu-plugins\//,
];

// Safe to browse (read-only)
const SAFE_PATTERNS = [
  /^wp-content\/uploads\//,
  /^wp-content\/themes\/.*\.(css|js|html|txt|md)$/,
];

export function classifyFileRisk(filePath: string): RiskLevel {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) return "blocked";
  }

  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalized)) return "high";
  }

  for (const pattern of SAFE_PATTERNS) {
    if (pattern.test(normalized)) return "safe";
  }

  return "medium";
}

export function classifyActionRisk(action: string): RiskLevel {
  const riskMap: Record<string, RiskLevel> = {
    // cPanel actions
    "backup.create": "high",
    "backup.list": "safe",
    "files.list": "safe",
    "files.read": "safe",
    "files.edit": "high",
    "files.delete": "critical",
    "info.disk": "safe",
    "info.server": "safe",

    // WordPress REST actions
    "posts.list": "safe",
    "posts.read": "safe",
    "posts.create": "medium",
    "posts.update": "medium",
    "posts.delete": "critical",
    "pages.list": "safe",
    "pages.read": "safe",
    "pages.update": "medium",
    "settings.read": "safe",
    "settings.update": "high",
    "plugins.list": "safe",
    "plugins.install": "high",
    "plugins.activate": "medium",
    "plugins.deactivate": "medium",
    "plugins.delete": "critical",
    "health.check": "safe",

    // Elementor — ALWAYS blocked via REST
    "elementor.update": "blocked",
  };

  return riskMap[action] ?? "medium";
}

export const riskConfig: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string; requiresConfirm: boolean }
> = {
  safe: {
    label: "Safe",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    requiresConfirm: false,
  },
  medium: {
    label: "Medium",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    requiresConfirm: false,
  },
  high: {
    label: "High",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    requiresConfirm: true,
  },
  blocked: {
    label: "Blocked",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    requiresConfirm: false, // Can't confirm — always denied
  },
  critical: {
    label: "Critical",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-200 dark:bg-red-900/50",
    requiresConfirm: true, // Double confirmation
  },
};
