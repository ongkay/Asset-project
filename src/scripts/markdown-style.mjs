import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "build",
  "coverage",
  "dist",
  ".playwright-mcp",
  ".agents",
  ".docs",
  ".worktrees",
  ".codex",
  ".gemini",
  ".github",
  ".opencode",
  ".agent",
  "docs/superpowers",
  "docs/superpowers/plans",
  "openspec",
]);

const DEFAULT_IGNORED_FILES = new Set(["pnpm-lock.yaml"]);

function isBlank(line) {
  return line.trim() === "";
}

function isFence(line) {
  return /^```|^~~~/.test(line.trimStart());
}

function isTableLikeLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.includes("|");
}

function splitTableCells(line) {
  const trimmed = line.trim();
  const normalized = trimmed.replace(/^\|/u, "").replace(/\|$/u, "");
  return normalized.split(/(?<!\\)\|/u).map((cell) => cell.trim());
}

function isTableSeparatorCell(cell) {
  return /^:?-{3,}:?$/u.test(cell.trim());
}

function isTableSeparatorLine(line) {
  if (!isTableLikeLine(line)) {
    return false;
  }

  const cells = splitTableCells(line);
  return cells.length > 0 && cells.every(isTableSeparatorCell);
}

function detectTableAlignment(cell) {
  const trimmed = cell.trim();

  if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
    return "center";
  }

  if (trimmed.endsWith(":")) {
    return "right";
  }

  if (trimmed.startsWith(":")) {
    return "left";
  }

  return "left";
}

function padCenter(value, width) {
  if (value.length >= width) {
    return value;
  }

  const totalPadding = width - value.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${" ".repeat(leftPadding)}${value}${" ".repeat(rightPadding)}`;
}

function renderTableCell(value, width, align) {
  switch (align) {
    case "right":
      return ` ${value.padStart(width)} `;
    case "center":
      return ` ${padCenter(value, width)} `;
    default:
      return ` ${value.padEnd(width)} `;
  }
}

function renderTableSeparator(width, align) {
  const normalizedWidth = Math.max(width, 3);

  switch (align) {
    case "right":
      return ` ${"-".repeat(normalizedWidth - 1)}: `;
    case "center":
      return ` :${"-".repeat(Math.max(normalizedWidth - 2, 1))}: `;
    default:
      return ` ${"-".repeat(normalizedWidth)} `;
  }
}

function formatTableBlock(lines) {
  const headerCells = splitTableCells(lines[0]);
  const separatorCells = splitTableCells(lines[1]);
  const bodyRows = lines.slice(2).map(splitTableCells);
  const columnCount = Math.max(headerCells.length, separatorCells.length, ...bodyRows.map((row) => row.length));

  const alignments = Array.from({ length: columnCount }, (_, index) =>
    detectTableAlignment(separatorCells[index] ?? "---"),
  );

  const normalizedRows = [headerCells, ...bodyRows].map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );

  const columnWidths = Array.from({ length: columnCount }, (_, index) =>
    Math.max(3, ...normalizedRows.map((row) => row[index].length)),
  );

  const renderRow = (row) =>
    `|${row.map((cell, index) => renderTableCell(cell, columnWidths[index], alignments[index])).join("|")}|`;

  const separatorRow = `|${columnWidths
    .map((width, index) => renderTableSeparator(width, alignments[index]))
    .join("|")}|`;

  return [renderRow(normalizedRows[0]), separatorRow, ...normalizedRows.slice(1).map(renderRow)];
}

function isHeading(line) {
  return /^#{1,6}\s+\S/.test(line);
}

function isBlockquote(line) {
  return /^\s*>/.test(line);
}

function getListItemMeta(line) {
  const match = line.match(/^(\s*)(- \[[ xX]\]|- |\d+\.\s)/);

  if (!match) {
    return null;
  }

  return {
    indent: match[1].length,
  };
}

function isListItem(line) {
  return getListItemMeta(line) !== null;
}

function getIndent(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function isIndentedDetail(line) {
  if (isBlank(line) || isListItem(line) || isBlockquote(line) || isHeading(line) || isFence(line)) {
    return false;
  }

  return getIndent(line) >= 2;
}

function normalizeLineMarkers(line) {
  if (isFence(line)) {
    return line;
  }

  let normalized = line.replace(/^(\s*)[*+](\s+.*)$/u, "$1-$2");
  normalized = normalized.replace(/^(\s*)(\d+)\)(\s+.*)$/u, "$1$2.$3");
  return normalized;
}

function shouldJoinHeadingToNext(nextLine) {
  return !isBlank(nextLine) && !isHeading(nextLine);
}

function shouldJoinParagraphToNext(currentLine, nextLine) {
  if (isBlank(currentLine) || isHeading(currentLine) || isFence(currentLine) || isIndentedDetail(currentLine)) {
    return false;
  }

  if (isListItem(nextLine) || isBlockquote(nextLine)) {
    return !isListItem(currentLine) && !isBlockquote(currentLine);
  }

  return false;
}

function formatMarkdownContent(input) {
  const normalizedInput = input.replace(/\r\n?/gu, "\n");
  const lines = [];
  let inFence = false;

  for (const rawLine of normalizedInput.split("\n")) {
    if (isFence(rawLine)) {
      lines.push(rawLine);
      inFence = !inFence;
      continue;
    }

    lines.push(inFence ? rawLine : normalizeLineMarkers(rawLine));
  }

  const output = [];

  inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isFence(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    if (isTableLikeLine(line) && index + 1 < lines.length && isTableSeparatorLine(lines[index + 1])) {
      const tableLines = [line, lines[index + 1]];
      let cursor = index + 2;

      while (cursor < lines.length && isTableLikeLine(lines[cursor]) && !isBlank(lines[cursor])) {
        tableLines.push(lines[cursor]);
        cursor += 1;
      }

      output.push(...formatTableBlock(tableLines));
      index = cursor - 1;
      continue;
    }

    if (isHeading(line)) {
      output.push(line);

      let cursor = index + 1;

      while (cursor < lines.length && isBlank(lines[cursor])) {
        cursor += 1;
      }

      if (cursor > index + 1 && cursor < lines.length && shouldJoinHeadingToNext(lines[cursor])) {
        index = cursor - 1;
      }

      continue;
    }

    output.push(line);

    if (isBlank(line)) {
      continue;
    }

    let cursor = index + 1;

    while (cursor < lines.length && isBlank(lines[cursor])) {
      cursor += 1;
    }

    if (cursor >= lines.length) {
      continue;
    }

    const nextLine = lines[cursor];

    if (shouldJoinParagraphToNext(line, nextLine)) {
      index = cursor - 1;
      continue;
    }

    if (isListItem(line) && cursor > index + 1 && isIndentedDetail(nextLine)) {
      index = cursor - 1;
      continue;
    }

    if (isBlockquote(line) && cursor > index + 1 && isBlockquote(nextLine)) {
      index = cursor - 1;
      continue;
    }

    if (isIndentedDetail(line) && cursor === index + 1 && isListItem(nextLine)) {
      output.push("");
    }
  }

  const collapsedOutput = [];

  for (let index = 0; index < output.length; index += 1) {
    const line = output[index];

    if (isBlank(line) && isBlank(output[index - 1] ?? "") && isBlank(output[index + 1] ?? "")) {
      continue;
    }

    collapsedOutput.push(line);
  }

  return `${collapsedOutput
    .join("\n")
    .replace(/\n{3,}$/u, "\n\n")
    .trimEnd()}\n`;
}

async function walkMarkdownFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    const relativePath = path.relative(ROOT_DIR, absolutePath);

    if (entry.isDirectory()) {
      if (DEFAULT_IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      files.push(...(await walkMarkdownFiles(absolutePath)));
      continue;
    }

    if (DEFAULT_IGNORED_FILES.has(entry.name)) {
      continue;
    }

    if (entry.isFile() && relativePath.endsWith(".md")) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function normalizeInputPaths(inputPaths) {
  if (inputPaths.length === 0) {
    return walkMarkdownFiles(ROOT_DIR);
  }

  const files = [];

  for (const inputPath of inputPaths) {
    const absolutePath = path.resolve(ROOT_DIR, inputPath);
    const fileStats = await stat(absolutePath);

    if (fileStats.isDirectory()) {
      files.push(...(await walkMarkdownFiles(absolutePath)));
      continue;
    }

    if (absolutePath.endsWith(".md")) {
      files.push(absolutePath);
    }
  }

  return [...new Set(files)].sort();
}

export async function collectMarkdownFiles(inputPaths = []) {
  return normalizeInputPaths(inputPaths);
}

export async function fixMarkdownFiles(inputPaths = []) {
  const files = await normalizeInputPaths(inputPaths);
  const changedFiles = [];

  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    const formatted = formatMarkdownContent(original);

    if (formatted !== original) {
      await writeFile(filePath, formatted, "utf8");
      changedFiles.push(path.relative(ROOT_DIR, filePath));
    }
  }

  return changedFiles;
}

export async function checkMarkdownFiles(inputPaths = []) {
  const files = await normalizeInputPaths(inputPaths);
  const changedFiles = [];

  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    const formatted = formatMarkdownContent(original);

    if (formatted !== original) {
      changedFiles.push(path.relative(ROOT_DIR, filePath));
    }
  }

  return changedFiles;
}

export { formatMarkdownContent };
