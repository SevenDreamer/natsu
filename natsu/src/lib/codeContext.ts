/**
 * Code Context Module
 * Manages selected code context for AI explanation
 */

export interface CodeContext {
  code: string;
  language: string;
  filename: string | null;
  lineStart: number;
  lineEnd: number;
}

// Global state for selected code context
let selectedCodeContext: CodeContext | null = null;

/**
 * Detect programming language from filename extension
 */
export function detectLanguage(filename: string | null): string {
  if (!filename) return 'text';

  const ext = filename.toLowerCase().split('.').pop() || '';

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'mjs': 'javascript',
    'cjs': 'javascript',

    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'vue': 'vue',
    'svelte': 'svelte',

    // Data formats
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'xml': 'xml',

    // Programming languages
    'py': 'python',
    'rb': 'ruby',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'swift': 'swift',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'lua': 'lua',
    'r': 'r',
    'scala': 'scala',
    'clj': 'clojure',

    // Shell/Scripting
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'fish',
    'ps1': 'powershell',

    // Markup/Documentation
    'md': 'markdown',
    'mdown': 'markdown',
    'markdown': 'markdown',
    'rst': 'rest',
    'tex': 'latex',

    // Config
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'conf',
    'env': 'bash',

    // Other
    'sql': 'sql',
    'graphql': 'graphql',
    'gql': 'graphql',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'wasm': 'wasm',
  };

  return languageMap[ext] || 'text';
}

/**
 * Store selected code context
 */
export function setSelectedCode(context: CodeContext): void {
  selectedCodeContext = context;
}

/**
 * Get the current selected code context
 */
export function getSelectedCode(): CodeContext | null {
  return selectedCodeContext;
}

/**
 * Clear the selected code context
 */
export function clearSelectedCode(): void {
  selectedCodeContext = null;
}

/**
 * Format code context for AI prompt
 */
export function formatForAI(context: CodeContext): string {
  const { code, language, filename, lineStart, lineEnd } = context;

  const fileRef = filename
    ? `from file "${filename}" (lines ${lineStart}-${lineEnd})`
    : `(lines ${lineStart}-${lineEnd})`;

  return `Please explain this ${language} code ${fileRef}:

\`\`\`${language}
${code}
\`\`\`

Explain what this code does, how it works, and any notable patterns or potential issues.`;
}
