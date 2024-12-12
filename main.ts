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

    return contributionsMap;
  } catch (error) {
    console.error("Error reading files:", error);
  }
}

async function parseHTMLFiles() {
  const folderPath = "./table";
  const levelsMap = new Map<string, number>();

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
            levelsMap.set(date, parseInt(level, 10));
          }
        });
      }
    }

    return levelsMap;
  } catch (error) {
    console.error("Error processing files:", error);
  }
}
function getMonthName(monthNumber: number) {
  if (monthNumber > 12 || monthNumber < 0) {
    throw new Error("invalid month number");
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return monthNames[monthNumber - 1];
}

async function writeCombinedMapAsCSV(
  combinedMap: Map<string, Map<"contributions" | "level", number | undefined>>,
  filePath: string
) {
  let output = "date,year,month,contributions,level\n";

  for (const [date, innerMap] of combinedMap) {
    const contributions = innerMap.get("contributions") || 0;
    const level = innerMap.get("level") || 0;
    output += `${date},${date.split("-")[0]},${getMonthName(
      Number(date.split("-")[1])
    )},${contributions},${level}\n`;
  }

  await Deno.writeTextFile(filePath, output);
  console.log(`Combined map has been written as CSV to ${filePath}`);
}

async function main() {
  const contributions: Map<string, number> | undefined = await parseYMLFiles();
  const levels: Map<string, number> | undefined = await parseHTMLFiles();

  if (!contributions || !levels) {
    console.error(
      "One or both maps are undefined. Ensure the parsing functions return valid maps."
    );
    return;
  }

  const combinedMap: Map<
    string,
    Map<"contributions" | "level", number | undefined>
  > = new Map();
  const allDates = new Set([...contributions.keys(), ...levels.keys()]);

  allDates.forEach((date) => {
    const dateMap: Map<"contributions" | "level", number | undefined> =
      new Map();
    if (contributions.has(date)) {
      dateMap.set("contributions", contributions.get(date));
    }
    if (levels.has(date)) {
      dateMap.set("level", levels.get(date));
    }
    combinedMap.set(date, dateMap);
  });

  writeCombinedMapAsCSV(combinedMap, "csv/contritbutions-and-levels.txt");

}

main();
