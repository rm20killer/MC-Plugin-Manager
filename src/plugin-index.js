const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { table } = require("table");
const cliProgress = require("cli-progress");

// const config = require("../config.yaml");
async function IndexFolder() {
  //   const PathToPluginFolder = "D:/server/minecraft/1.21/testing/plugins";
  const PathToPluginFolder = "D:/server/server manager/servers/1.12.5 testing/plugins";
  const FileName = "plugins.json";

  const filePath = path.join(PathToPluginFolder, FileName);
  //get all files in the folder ending with .jar
  const files = await fs.readdir(PathToPluginFolder);
  const pluginFiles = files.filter((file) => file.endsWith(".jar"));
  const totalPlugins = pluginFiles.length;

  // Create a new progress bar instance
  const progressBar = new cliProgress.SingleBar({
    format:
      "Indexing |" +
      chalk.cyan("{bar}") +
      "| {percentage}% || {value}/{total} Plugins",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  // Start the progress bar
  progressBar.start(totalPlugins, 0);

  let processedPlugins = 0;

  // Create the index.json file if it doesn't exist
  const indexFilePath = path.join(PathToPluginFolder, ".index.json");
  let indexData = { plugins: [] };
  //loop through the files and index them by searching them on spigot
  for (const file of pluginFiles) {
    try {
      let pluginName = file.split(/[_-]/)[0];
      //if file.split(/[_-]/)[1] does not contain a number with more then 3 letters, include it in the plugin name
      if (file.split(/[_-]/)[1] && /^[a-zA-Z]+$/.test(file.split(/[_-]/)[1])) {
        pluginName += " " + file.split(/[_-]/)[1];
      }
      //remove .jar from the file name
      pluginName = pluginName.replace(".jar", "");
      // version should be the file name not including the plugin name and the .jar there may be multiple - after the first one
      const version = file.split(/[_-]/).slice(1).join("-").replace(".jar", "");

      //remove any letters from the version string
      const versionNumber = version.replace(/[^0-9.]/g, "");
      //check if the plugin is already in the index.json file
      const existingPlugin = indexData.plugins.find(
        (plugin) => plugin.plugin_name === pluginName
      );
      if (!existingPlugin) {
        let pluginData = await spigotCheck(pluginName);
        if (pluginData) {
          let newVersionNumber = await spigotCheckVersion(pluginData.id);
          indexData.plugins.push({
            plugin_name: pluginData.name,
            plugin_id: pluginData.id,
            plugin_file_name: file,
            plugin_file_version: versionNumber,
            plugin_latest_version: newVersionNumber,
            plugin_is_outdated: CheckVersion(versionNumber, newVersionNumber),
            plugin_repository: `https://www.spigotmc.org/resources/${pluginData.id}/`,
          });
        } else {
          let pluginData = await ModrinthCheck(pluginName);
          if (pluginData) {
            let newVersionNumber = await ModrinthCheckVersion(
              pluginData.project_id
            );
            indexData.plugins.push({
              plugin_name: pluginData.title,
              plugin_id: pluginData.project_id,
              plugin_file_name: file,
              plugin_file_version: versionNumber,
              plugin_latest_version: newVersionNumber,
              plugin_is_outdated: CheckVersion(versionNumber, newVersionNumber),
              plugin_repository: `https://modrinth.com/plugin/${pluginData.project_id}`,
            });
          } else {
            console.log(chalk.red(` | Plugin "${pluginName}" not found`));
            //still push data to the index.json file with the plugin name and file name only
            indexData.plugins.push({
              plugin_name: pluginName,
              plugin_id: null,
              plugin_file_name: file,
              plugin_file_version: versionNumber,
              plugin_latest_version: null,
              plugin_is_outdated: null,
              plugin_repository: null,
            });
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error processing file "${file}":`), error);
      continue; // Skip to the next file on error
    } finally {
      processedPlugins++;
      progressBar.update(processedPlugins);
    }
  }
  // Write the index data to the index.json file
  await fs.writeFile(indexFilePath, JSON.stringify(indexData, null, 2));
  console.log(chalk.green(` | Index file created at ${indexFilePath}`));
  // Display the index data in a table format
  console.log(chalk.cyanBright("----------------------------------------"));
  console.log(chalk.white("Indexing complete."));
  console.log(chalk.cyanBright("----------------------------------------"));
  console.log(chalk.white("Plugins indexed:"));
  const tableData = [
    [
      "Name",
      "ID",
      "File Name",
      "File Version",
      "Latest Version",
      "outdated",
      "Repository",
    ],
  ];
  indexData.plugins.forEach((plugin) => {
    tableData.push([
      plugin.plugin_name,
      plugin.plugin_id,
      plugin.plugin_file_name,
      plugin.plugin_file_version,
      plugin.plugin_latest_version,
      plugin.plugin_is_outdated,
      plugin.plugin_repository,
    ]);
  });
  const output = table(tableData, {
    columns: {
      0: { alignment: "left" },
      1: { alignment: "left" },
      2: { alignment: "left" },
      3: { alignment: "left" },
      4: { alignment: "left" },
      5: { alignment: "left" },
      6: { alignment: "left" },
    },
  });
  console.log(output);
  console.log(chalk.white(totalPlugins + " plugins total."));
}

module.exports = {
  IndexFolder,
};

async function spigotCheck(pluginName) {
  try {
    const response = await fetch(
      `https://api.spiget.org/v2/search/resources/${encodeURIComponent(
        pluginName
      )}?fields=id,name`
    );
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const firstResult = data[0];
      if (firstResult.name) {
        // Get the first word of the plugin name from the filename
        const firstWordPlugin = pluginName.toLowerCase().split(/[^a-z0-9]/)[0];

        // Get the first word of the Spiget result's name
        const firstWordResult = firstResult.name
          .toLowerCase()
          .split(/[^a-z0-9]/)[0];

        // Check if the first words match
        if (
          firstWordPlugin &&
          firstWordResult &&
          firstWordPlugin === firstWordResult
        ) {
          return firstResult;
        } else {
          //   console.log(
          //     chalk.yellow(
          //       ` | Spigot result "${firstResult.name}" does not match "${pluginName}" Skipping.`
          //     )
          //   );
          return null;
        }
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error(
      chalk.red(`Error fetching Spigot plugin data for "${pluginName}":`),
      error
    );
    return null;
  }
}

async function ModrinthCheck(pluginName) {
  try {
    const response = await fetch(
      `https://api.modrinth.com/v2/search?query=${encodeURIComponent(
        pluginName
      )}&limit=5`
    );
    const data = await response.json();
    if (data.hits.length > 0) {
      const pluginData = data.hits.find(
        (plugin) =>
          plugin.server_side === "required" &&
          (plugin.categories.includes("bukkit") ||
            plugin.categories.includes("spigot") ||
            plugin.categories.includes("paper"))
      );
      if (pluginData) {
        if (pluginData.title) {
          const firstWordPlugin = pluginName
            .toLowerCase()
            .split(/[^a-z0-9]/)[0];

          const firstWordResult = pluginData.title
            .toLowerCase()
            .split(/[^a-z0-9]/)[0];

          if (
            firstWordPlugin &&
            firstWordResult &&
            firstWordPlugin === firstWordResult
          ) {
            return pluginData;
          } else {
            // console.log(
            //   chalk.yellow(
            //     ` | Modrinth result "${pluginData.title}" does not match "${pluginName}" Skipping.`
            //   )
            // );
            return null;
          }
        }
        return pluginData;
      }
    } else {
      //   console.log(chalk.yellow(`No results found for "${pluginName}".`));
      return null;
    }
  } catch (error) {
    console.error(
      chalk.red(`Error fetching Modrinth plugin data for "${pluginName}":`),
      error
    );
    return null;
  }
}

async function ModrinthCheckVersion(pluginID) {
  try {
    const response = await fetch(
      `https://api.modrinth.com/v2/project/${pluginID}/version`
    );
    const data = await response.json(); //get the first version that is compatible with bukkit, spigot or paper
    const compatibleVersion = data.find((version) =>
      version.loaders.some(
        (loader) =>
          loader === "bukkit" || loader === "spigot" || loader === "paper"
      )
    );
    if (compatibleVersion) {
      return compatibleVersion.version_number;
    }
  } catch (error) {
    console.error(
      chalk.red(`Error fetching Modrinth plugin data for "${pluginID}":`),
      error
    );
    return null;
  }
}

async function spigotCheckVersion(pluginID) {
  try {
    const versionResponse = await fetch(
      `https://api.spiget.org/v2/resources/${pluginID}/versions/latest`
    );
    if (!versionResponse.ok) {
      console.error(
        chalk.red(
          `Spiget API error (version): ${versionResponse.status} - ${versionResponse.statusText}`
        )
      );
      return null;
    }
    const versionData = await versionResponse.json();
    if (versionData) {
      return versionData.name; // Return the latest version name
    } else {
      console.log(chalk.yellow(`No versions found for "${pluginID}".`));
      return null;
    }
  } catch (error) {
    console.error(
      chalk.red(`Error fetching Spigot plugin data for "${pluginID}":`),
      error
    );
    return null;
  }
}

function CheckVersion(oldVersion, newVersion) {
  const oldVersionParts = oldVersion.split(".");
  const newVersionParts = newVersion.split(".");

  for (
    let i = 0;
    i < Math.max(oldVersionParts.length, newVersionParts.length);
    i++
  ) {
    const oldPart = parseInt(oldVersionParts[i] || "0", 10);
    const newPart = parseInt(newVersionParts[i] || "0", 10);

    if (newPart > oldPart) {
      return true; // New version is greater
    } else if (newPart < oldPart) {
      return false; // Old version is greater
    }
  }

  return false; // Versions are equal
}
