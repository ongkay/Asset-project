export function formatMarkdownContent(input: string): string;
export function collectMarkdownFiles(inputPaths?: string[]): Promise<string[]>;
export function fixMarkdownFiles(inputPaths?: string[]): Promise<string[]>;
export function checkMarkdownFiles(inputPaths?: string[]): Promise<string[]>;
