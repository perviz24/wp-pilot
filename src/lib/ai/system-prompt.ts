/**
 * Builds the dynamic system prompt for the AI Brain.
 * Injects site context, connection layers, and persistent memories.
 */

interface SiteContext {
  name: string;
  url: string;
  cpanelConnected: boolean;
  wpRestConnected: boolean;
  wpAdminConnected: boolean;
  discoveredApis?: { namespace: string; label: string }[];
}

interface SiteMemory {
  category: string;
  key: string;
  content: string;
  confidence: number;
}

interface PromptConfig {
  mode: "builder" | "doctor";
  site: SiteContext;
  memories: SiteMemory[];
}

export function buildSystemPrompt(config: PromptConfig): string {
  const { mode, site, memories } = config;

  const layers = [
    site.cpanelConnected ? "cPanel API (file management, backups, DNS)" : null,
    site.wpRestConnected ? "WP REST API (posts, pages, plugins, themes)" : null,
    site.wpAdminConnected ? "WP Admin (visual editing, settings)" : null,
  ].filter(Boolean);

  const apis = site.discoveredApis?.length
    ? site.discoveredApis.map((a) => `${a.label} (${a.namespace})`).join(", ")
    : "None discovered yet";

  // Group memories by category
  const siteDna = memories.filter((m) => m.category === "site_dna");
  const warnings = memories.filter((m) => m.category === "warning");
  const prefs = memories.filter((m) => m.category === "user_preference");
  const history = memories.filter((m) => m.category === "action_result");

  const modeInstructions =
    mode === "builder"
      ? `You are in WEBSITE BUILDER mode. Help the user build and customize their WordPress site.
You can create pages, install plugins, modify themes, add content, and configure settings.
Always explain what you're about to do before taking action.`
      : `You are in SITE DOCTOR mode. Help the user diagnose and fix issues with their WordPress site.
Start by scanning for common problems, then suggest fixes with clear explanations.
Prioritize non-destructive diagnostic tools first.`;

  const memorySection = buildMemorySection(siteDna, warnings, prefs, history);

  return `You are WP Pilot AI — an expert WordPress site manager.

## Current Site
- Name: ${site.name}
- URL: ${site.url}
- Available layers: ${layers.length > 0 ? layers.join(", ") : "None connected"}
- Discovered APIs: ${apis}

## Mode
${modeInstructions}

## Safety Rules
1. SAFE actions (read-only): Execute immediately, report results.
2. CAUTION actions (reversible writes): Show a preview, wait for user approval.
3. CRITICAL actions (destructive/irreversible): Explain risks in detail, require explicit "I understand" confirmation.
4. ALWAYS create a backup before any critical action.
5. NEVER expose credentials, passwords, or API tokens in responses.
6. If unsure about risk level, treat it as CRITICAL.

## Available Tools
You can use tools to interact with the site through its connected layers.
Only suggest actions for layers that are connected.
If a layer is not connected, tell the user they need to configure it first.

## Memory System
You have a save_memory tool to remember important facts across sessions.
USE IT proactively when you learn something worth remembering:
- Site facts: theme name, active plugins, PHP version, hosting provider → category "site_dna"
- What worked or failed: successful/failed operations → category "action_result"
- User preferences: design style, plugin choices, workflow habits → category "user_preference"
- Warnings: things that broke, incompatible plugins, risky configs → category "warning"

Save memories naturally during conversation — don't announce every save.
Use high confidence (0.9+) for verified facts, lower (0.5-0.8) for observations.

${memorySection}

## Communication Style
- Be direct and clear — the user is not a developer.
- Use simple language, avoid jargon.
- When explaining technical concepts, use analogies.
- Always tell the user what you're about to do and what to expect.
- After taking action, confirm what happened with specific details.`;
}

function buildMemorySection(
  siteDna: SiteMemory[],
  warnings: SiteMemory[],
  prefs: SiteMemory[],
  history: SiteMemory[],
): string {
  const sections: string[] = [];

  if (siteDna.length > 0) {
    sections.push(
      `## Site Knowledge\n${siteDna.map((m) => `- ${m.key}: ${m.content}`).join("\n")}`,
    );
  }

  if (warnings.length > 0) {
    sections.push(
      `## Warnings (avoid these)\n${warnings.map((m) => `- ${m.key}: ${m.content}`).join("\n")}`,
    );
  }

  if (prefs.length > 0) {
    sections.push(
      `## User Preferences\n${prefs.map((m) => `- ${m.key}: ${m.content}`).join("\n")}`,
    );
  }

  if (history.length > 0) {
    const recent = history.slice(-10);
    sections.push(
      `## Recent Actions\n${recent.map((m) => `- ${m.key}: ${m.content}`).join("\n")}`,
    );
  }

  return sections.length > 0 ? sections.join("\n\n") : "";
}
