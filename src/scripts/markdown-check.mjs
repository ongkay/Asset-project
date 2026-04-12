import { checkMarkdownFiles } from "./markdown-style.mjs";

const changedFiles = await checkMarkdownFiles(process.argv.slice(2));

if (changedFiles.length > 0) {
  console.error("Markdown rules check failed. The following files need normalization:");

  for (const filePath of changedFiles) {
    console.error(`- ${filePath}`);
  }

  process.exit(1);
}

console.log("All checked Markdown files match repo rules.");
