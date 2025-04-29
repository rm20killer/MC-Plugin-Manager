const config = require("../config");
const index = require("./plugin-index.js");
const fs = require("fs").promises;
const chalk = require("chalk");
const path = require("path");
const { table } = require("table");
async function checkPluginVersion() {
	const pluginPath = path.join(
		await config.GetServerPath(),
		"plugins"
	);

	//get .index.json file from plugin folder
	const indexFilePath = path.join(pluginPath, ".index.json");

	const indexFile = await fs.readFile(indexFilePath, "utf8");
    if (!indexFile) {
        console.log(chalk.red(`No index.json file found in ${pluginPath}, consider running index command`));
        return;
    }
	const indexData = JSON.parse(indexFile);

	const plugins = indexData.plugins;
	if (!plugins || plugins.length === 0) {
		console.log(chalk.red(`No plugins found in ${pluginPath}`));
		return;
	}
    let UpdatedCount = 0;
	//loop through each plugin and check if the version is up to date by using ModrinthCheckVersion and SpigotCheckVersion
	const pluginUpdates = await Promise.all(
		plugins.map(async (plugin) => {
            if(!plugin.plugin_repository) {
                return null;
            }
            let lastVersion
            let oldLastVersion = plugin.plugin_latest_version
			if (plugin.plugin_repository.includes("spigotmc.org")) {
				lastVersion = await index.spigotCheckVersion(plugin.plugin_id);
			} else if (plugin.plugin_repository.includes("modrinth.com")) {
				lastVersion = await index.ModrinthCheckVersion(plugin.plugin_id);
			}
            else {
                return null;
            }

            if (lastVersion && lastVersion !== oldLastVersion) {
                plugin.plugin_latest_version = lastVersion;
                plugin.plugin_is_outdated = index.CheckVersion(plugin.plugin_file_version, lastVersion);
                UpdatedCount++;
                console.log(
                    chalk.yellow(
                        `New release of "${plugin.plugin_name}" was found. Latest version: ${lastVersion}`
                    )
                );
            }
            return {
                plugin_name: plugin.plugin_name,
                plugin_id: plugin.plugin_id,
                plugin_file_name: plugin.plugin_file_name,
                plugin_latest_version: lastVersion,
                plugin_is_outdated: plugin.plugin_is_outdated,
                plugin_repository: plugin.plugin_repository,
            };

		})
        //save the updated plugin data to index.json
	).then(async (updates) => {
        const updatedPlugins = updates.filter((plugin) => plugin !== null);
        if (updatedPlugins.length > 0) {
            await fs.writeFile(indexFilePath, JSON.stringify(indexData, null, 2));
            console.log(chalk.green("index.json file updated successfully."));
        } else {
            console.log(chalk.yellow("No new relesae found."));
            console.log(chalk.yellow("Those checks do not check non modrinth or spigot plugins."));
        }
        return updatedPlugins;
    }
    );

    //display the plugin updates
    const tableData = [
		[
			"Name",
			"ID",
			"File Name",
			"File Version",
			"Latest Version",
			"supported Versions",
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
			plugin.plugin_supported_versions,
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
    console.log(chalk.white("Plugins:"));
	console.log(output);
    console.log(chalk.green(`${UpdatedCount} plugins updated`));
    return;
}


module.exports = {
    checkPluginVersion,
};