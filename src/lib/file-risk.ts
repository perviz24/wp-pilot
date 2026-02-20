// Risk classification for WordPress files/directories
// red = critical (editing can break site), yellow = caution, green = safe

type RiskLevel = "critical" | "caution" | "safe";

interface RiskInfo {
  level: RiskLevel;
  color: string;
  bgColor: string;
  label: string;
}

const CRITICAL_FILES = new Set([
  "wp-config.php",
  ".htaccess",
  "wp-settings.php",
  "wp-login.php",
  "wp-cron.php",
  "xmlrpc.php",
  "wp-config-sample.php",
]);

const CRITICAL_DIRS = new Set([
  "wp-admin",
  "wp-includes",
]);

const CAUTION_PATTERNS = [
  /^wp-content\/plugins\//,
  /^wp-content\/themes\//,
  /^wp-content\/mu-plugins\//,
  /\.php$/,
  /\.sql$/,
  /\.env/,
];

const SAFE_DIRS = new Set([
  "wp-content/uploads",
  "wp-content/cache",
  "wp-content/logs",
]);

export function getFileRisk(name: string, fullpath: string, isDir: boolean): RiskInfo {
  const fileName = name.toLowerCase();
  const path = fullpath.replace(/^\/home\/[^/]+\/public_html\/?/, "");

  if (CRITICAL_FILES.has(fileName)) {
    return { level: "critical", color: "text-red-500", bgColor: "bg-red-500/10", label: "Critical" };
  }

  if (isDir && CRITICAL_DIRS.has(path)) {
    return { level: "critical", color: "text-red-500", bgColor: "bg-red-500/10", label: "Core" };
  }

  if (isDir && Array.from(SAFE_DIRS).some((d) => path.startsWith(d))) {
    return { level: "safe", color: "text-green-500", bgColor: "bg-green-500/10", label: "Safe" };
  }

  if (CAUTION_PATTERNS.some((p) => p.test(path) || p.test(fileName))) {
    return { level: "caution", color: "text-yellow-500", bgColor: "bg-yellow-500/10", label: "Caution" };
  }

  return { level: "safe", color: "text-green-500", bgColor: "bg-green-500/10", label: "Safe" };
}

export function getFileIcon(name: string, isDir: boolean): string {
  if (isDir) return "folder";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "php": return "php";
    case "js": case "ts": case "jsx": case "tsx": return "code";
    case "css": case "scss": case "less": return "style";
    case "html": case "htm": return "html";
    case "jpg": case "jpeg": case "png": case "gif": case "svg": case "webp": return "image";
    case "pdf": case "doc": case "docx": case "txt": return "doc";
    case "zip": case "gz": case "tar": case "rar": return "archive";
    case "sql": return "database";
    case "json": case "xml": case "yaml": case "yml": return "config";
    case "log": return "log";
    default: return "file";
  }
}
