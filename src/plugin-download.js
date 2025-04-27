const fs = require("fs").promises;
const { createWriteStream } = require("fs");
const { Readable } = require("node:stream"); 
const chalk = require("chalk");
const path = require("path");


async function downloadAllPlugin() {
  try {
    const indexDataRaw = await fs.readFile("index.json", "utf8");
    const indexData = JSON.parse(indexDataRaw);

    // Access the 'plugins' array
    const pluginsArray = indexData.plugins;

    if (!Array.isArray(pluginsArray)) {
      console.error(
        chalk.red(
          "Error: 'plugins' key in index.json does not contain an array."
        )
      );
      return;
    }

    const pluginNames = pluginsArray.map((plugin) => plugin.plugin_name);
    console.log(chalk.green("Found plugins:", pluginNames));

    for (const plugin of pluginsArray) {
      await downloadPlugin(plugin.plugin_name);
    }
    
    console.log(chalk.green("Finished processing all plugins."));
  } catch (error) {
    console.error(chalk.red("Error in downloadAllPlugin:", error.message));
  }
}

async function downloadPlugin(pluginName) {
  //look though the index.json file for the plugin name and get the repo link
  const data = await fs.readFile("index.json", "utf8");
  const indexData = JSON.parse(data);
  const plugin = indexData.plugins.find((p) => p.plugin_name === pluginName);
  if (!plugin) {
    console.log(chalk.red(`Plugin "${pluginName}" not found in index.json`));
    return;
  }

  const repoLink = plugin.plugin_repository;
  if (!repoLink) {
    console.log(
      chalk.red(`No repository link found for plugin "${pluginName}"`)
    );
    return;
  }
  // Spigot plugin download link
  if (repoLink.startsWith("https://www.spigotmc.org/resources/")) {
    //https://api.spiget.org/v2/resources/{plugin_id}/download
    const url = `https://api.spiget.org/v2/resources/${plugin.plugin_id}/download`;
    //file name should be name //remove anything after " - " or "[" or "("
    const fileName =
      plugin.plugin_name.split(" - ")[0].split(" [")[0].split(" (")[0] +
      "_" +
      plugin.plugin_latest_version + 
      ".jar";
    //download the file from the url and save it to the plugins folder with the file name
    //if there is a file with the same name, delete it and download the new one
    const filePath = path.join("plugins", fileName);
    try {
      await fs.access(filePath);
      console.log(
        chalk.yellow(`File "${fileName}" already exists. skipping...`)
      );
      return;
      await fs.unlink(filePath);
      console.log(chalk.green(`File "${fileName}" deleted successfully.`));
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error(
          chalk.red(`Error checking file existence: ${err.message}`)
        );
        return;
      }
    }
    //download the file from the url and save it to the plugins folder with the file name
    await downloadFromURL(url, fileName);

    // downloadFromURL(url, fileName);
  } else if (repoLink.startsWith("https://modrinth.com/plugin/")) {
    // Modrinth plugin download link
    const modrinthPluginId = plugin.plugin_id;
    const searchResponse = await fetch('https://api.modrinth.com/v2/project/' + modrinthPluginId);
    const Data = await searchResponse.json();
    // console.log(Data);
    if (!Data || !Data.versions || Data.versions.length === 0) {
        console.error(chalk.red(`No versions found for plugin "${pluginName}"`));
        return;
        }
    // Get the latest version ID from the response assume the last version is the latest but make sure loaders support bukkit, spigot or paper
    const versionId = Data.versions[Data.versions.length - 1];
    // const versionId = Data.versions;
    const versionResponse = await fetch(
      `https://api.modrinth.com/v2/version/${versionId}`
    );
    if (!versionResponse.ok) {
        console.error(
            chalk.red(
            `Failed to fetch version data for plugin "${pluginName}": ${versionResponse.status} - ${versionResponse.statusText}`
            )
        );
        return;
        }
    const versionData = await versionResponse.json();
    // console.log(versionData);
    // return;
    const url = versionData.files[0].url;
    const fileName = versionData.files[0].filename;
    //if same file name exists, skip
    const filePath = path.join("plugins", fileName);
    try {
        await fs.access(filePath);
        console.log(
            chalk.yellow(`File "${fileName}" already exists. skipping...`)
        );
        return;
        await fs.unlink(filePath);
        console.log(chalk.green(`File "${fileName}" deleted successfully.`));
        }
    catch (err) {
        if (err.code !== "ENOENT") {
            console.error(
            chalk.red(`Error checking file existence: ${err.message}`)
            );
            return;
        }
    } 

    //download the file from the url and save it to the plugins folder with the file name
    await downloadFromURL(url, fileName);
  }
    else{
        console.log(chalk.red(`Plugin "${pluginName}" not found in index.json`));
        return;
    }
}

module.exports = { downloadAllPlugin, downloadPlugin };

async function downloadFromURL(url, fileName) {
  try {
    console.log(chalk.blue(`Downloading from: ${url}`));
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        chalk.red(
          `Failed to fetch ${url}: ${response.status} - ${response.statusText}`
        )
      );
      return;
    }

    const pluginsDir = "plugins";
    await fs.mkdir(pluginsDir, { recursive: true });
    const filePath = path.join(pluginsDir, fileName);
    const fileStream = createWriteStream(filePath);

    const nodeStream = Readable.fromWeb(response.body);

    new Promise((resolve, reject) => {
      nodeStream.pipe(fileStream);
      nodeStream.on("error", reject);
      fileStream.on("finish", resolve);
    });

    console.log(chalk.green(`Downloaded successfully to: ${filePath}`));
  } catch (error) {
    console.error(chalk.red(`Error downloading from ${url}: ${error.message}`));
  }
}
