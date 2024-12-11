import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts";
import { parse } from "jsr:@std/yaml";

async function parseYMLFiles() {
  const folderPath = "./contributions";
  const contributionsMap = new Map<string, number>();

  try {
    for await (const file of Deno.readDir(folderPath)) {
      if (
        file.isFile &&
        file.name.startsWith("contributions_") &&
        file.name.endsWith(".yml")
      ) {
        const filePath = `${folderPath}/${file.name}`;
        const fileContent = await Deno.readTextFile(filePath);
        const yamlData = parse(fileContent) as Record<string, number>;

        for (const [key, value] of Object.entries(yamlData)) {
          contributionsMap.set(key, value);
        }
      }
    }

    console.log("Contributions Map:");
    for (const [date, value] of contributionsMap.entries()) {
      console.log(`${date}: ${value}`);
    }
  } catch (error) {
    console.error("Error reading files:", error);
  }
}

async function parseHTMLFiles() {
  const folderPath = "./table";
  const contributionsMap = new Map<string, string>();

  try {
    for await (const file of Deno.readDir(folderPath)) {
      if (
        file.isFile &&
        file.name.startsWith("contributions_") &&
        file.name.endsWith(".html")
      ) {
        const filePath = `${folderPath}/${file.name}`;
        const fileContent = await Deno.readTextFile(filePath);

        const document = new DOMParser().parseFromString(
          fileContent,
          "text/html"
        );
        if (!document) {
          console.error(`Failed to parse HTML file: ${file.name}`);
          continue;
        }

        const tdElements = document.querySelectorAll("td");

        tdElements.forEach((td) => {
          const date = td.getAttribute("data-date");
          const level = td.getAttribute("data-level");

          if (date && level) {
            contributionsMap.set(date, level);
          }
        });
      }
    }

    console.log("Contributions Map:");
    for (const [date, level] of contributionsMap.entries()) {
      console.log(`${date}: ${level}`);
    }
  } catch (error) {
    console.error("Error processing files:", error);
  }
}

parseHTMLFiles();
