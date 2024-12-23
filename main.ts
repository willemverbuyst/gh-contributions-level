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

    if (!contributionsMap) {
      throw new Error("Parsing of yaml files failed.");
    }

    return contributionsMap;
  } catch (error) {
    console.error("Error reading files", error);
    throw new Error("Error reading files");
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

    if (!levelsMap) {
      throw new Error("Parsing of yaml files failed.");
    }

    return levelsMap;
  } catch (error) {
    console.error("Error processing files:", error);
    throw new Error("Error reading files");
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

async function computeContributionRanges(
  combinedMap: Map<string, Map<"level" | "contributions", number | undefined>>,
  filePath: string
) {
  const levelContributions: Map<string, Map<number, number[]>> = new Map();
  const ranges: Map<string, { level: number; min: number; max: number }[]> =
    new Map();

  for (const [key, values] of combinedMap) {
    const year = key.split("-")[0];

    if (!levelContributions.has(year)) {
      levelContributions.set(year, new Map());
    }

    const level = values.get("level");
    const contributions = values.get("contributions");

    if (level === undefined || contributions === undefined) {
      return;
    }

    if (!levelContributions.get(year)?.has(level)) {
      levelContributions.get(year)?.set(level, []);
    }
    levelContributions.get(year)!.get(level)!.push(contributions);
  }

  for (const [year] of levelContributions) {
    const contributionsForYear = levelContributions.get(year);
    if (!contributionsForYear) {
      return;
    }

    if (!ranges.get(year)) {
      ranges.set(year, []);
    }

    for (const [level, contributions] of contributionsForYear) {
      const min = Math.min(...contributions);
      const max = Math.max(...contributions);
      ranges.get(year)!.push({ level, min, max });
    }

    // Sort by level for clarity
    ranges.get(year)!.sort((a, b) => a.level - b.level);
  }

  let output: string = "";
  for (const [year, rangesPerYear] of ranges) {
    output += year + "\n";
    rangesPerYear.forEach(({ level, min, max }) => {
      output += `Level ${level}: Min = ${min}, Max = ${max}\n`;
    });
    output += "\n";
  }

  await Deno.writeTextFile(filePath, output);
  console.log(`Ranges have been written as CSV to ${filePath}`);
}

function createCombinedMap(
  contributions: Map<string, number>,
  levels: Map<string, number>
) {
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

  return combinedMap;
}

async function main() {
  const contributions = await parseYMLFiles();
  const levels = await parseHTMLFiles();

  const combinedMap = createCombinedMap(contributions, levels);

  await writeCombinedMapAsCSV(combinedMap, "csv/contritbutions-and-levels.txt");
  await computeContributionRanges(combinedMap, "csv/ranges.txt");
}

main();
