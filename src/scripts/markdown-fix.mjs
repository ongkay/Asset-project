import { fixMarkdownFiles } from "./markdown-style.mjs";

const changedFiles = await fixMarkdownFiles(process.argv.slice(2));

if (changedFiles.length > 0) {
  console.log("Markdown fixed:");

  for (const filePath of changedFiles) {
    console.log(`- ${filePath}`);
  }
} else {
  console.log("Markdown already matches repo rules.");
}
