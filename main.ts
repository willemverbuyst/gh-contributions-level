import { parse } from "jsr:@std/yaml";

const folderPath = "./contributions";
const contributionsMap = new Map();

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
