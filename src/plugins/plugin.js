const fs = require("fs").promises;
const chalk = require("chalk");
const { table } = require("table");

const addPlugin = async (platform, pluginName) => {
	if (platform == "spigot" || platform == "s") {
		console.log(chalk.yellow(`Adding plugin '${pluginName}' from spigot...`));
		const pluginInfo = await AddSpigotPlugin(pluginName);
		if (pluginInfo) {
			await displayPluginTable(); // Display the updated table after adding the plugin
			return pluginInfo;
		} else {
			console.log(chalk.red(`Failed to add plugin '${pluginName}'.`));
			return null;
		}
	}
	if (platform == "modrinth" || platform == "m") {
		console.log(chalk.yellow(`Adding plugin '${pluginName}' from modrinth...`));
		const pluginInfo = await AddModrinthPlugin(pluginName);
		if (pluginInfo) {
			await displayPluginTable(); // Display the updated table after adding the plugin
			return pluginInfo;
		} else {
			console.log(chalk.red(`Failed to add plugin '${pluginName}'.`));
			return null;
		}
	}
};
module.exports = { addPlugin };
const AddModrinthPlugin = async (pluginName) => {
	try {
		// Fetch the resource ID first.
		const searchResponse = await fetch(
			`https://api.modrinth.com/v2/search?query=${encodeURIComponent(
				pluginName
			)}&limit=5`
		);
		const searchData = await searchResponse.json();
		const pluginData = searchData.hits.find(
			(plugin) =>
				plugin.server_side === "required" &&
				(plugin.categories.includes("bukkit") ||
					plugin.categories.includes("spigot") ||
					plugin.categories.includes("paper"))
		);
		if (!pluginData) {
			console.log(
				chalk.yellow(`Modrinth plugin "${pluginName}" not found or not compatible.`)
			);
			return null;
		}
		// console.log(pluginData);
		const name = pluginData.title;
		// Get the plugin ID and version ID

		const pluginId = pluginData.project_id;
		const versionId = pluginData.latest_version;
		const versionResponse = await fetch(
			`https://api.modrinth.com/v2/version/${versionId}`
		);
		if (!versionResponse.ok) {
			console.error(
				chalk.red(
					`Modrinth API error (version): ${versionResponse.status} - ${versionResponse.statusText}`
				)
			);
			return null;
		}
		const versionData = await versionResponse.json();
		const latestVersionId = versionData.version_number;

		const data = await fs.readFile("index.json", "utf8");
		const indexData = JSON.parse(data);
		// Check if the plugin already exists in index.json

		const existingPlugin = indexData.plugins.find(
			(plugin) => plugin.plugin_id === pluginId
		);
		if (existingPlugin) {
			existingPlugin.plugin_latest_version = latestVersionId;
			existingPlugin.plugin_is_outdated = false; // Placeholder, you can implement logic to check if outdated
		} else {
			console.log(chalk.green(`Adding new plugin "${name}" to index`));
			fileName = "N/A"; // Placeholder, you can implement logic to get the file name
			// Add the new plugin to the index.json
			indexData.plugins.push({
				plugin_name: name,
				plugin_id: pluginId,
				plugin_file_name: fileName,
				plugin_latest_version: latestVersionId,
				plugin_is_outdated: false, // Placeholder, you can implement logic to check if outdated
				plugin_repository: `https://modrinth.com/plugin/${pluginId}`,
			});
		}
		await fs.writeFile("index.json", JSON.stringify(indexData, null, 2));
		console.log(chalk.green(`Plugin "${name}" added to index`));
		return indexData.plugins[0]; // Return the added plugin data
	} catch (error) {
		console.error(
			chalk.red(`Error fetching Modrinth plugin version for "${pluginName}":`),
			error
		);
		return null;
	}
};

const AddSpigotPlugin = async (pluginName) => {
	try {
		// Fetch the resource ID first.
		const searchResponse = await fetch(
			`https://api.spiget.org/v2/search/resources/${encodeURIComponent(
				pluginName
			)}?fields=id`
		);
		if (!searchResponse.ok) {
			console.error(
				chalk.red(
					`Spiget API error (search): ${searchResponse.status} - ${searchResponse.statusText}`
				)
			);
			return null;
		}
		const searchData = await searchResponse.json();
		// console.log(searchData);
		if (searchData && searchData.length > 0) {
			//add the first plugin found to the index.json file
			const resourceId = searchData[0].id;
			const name = searchData[0].name;
			// Now fetch the latest version using the resource ID.
			const versionResponse = await fetch(
				`https://api.spiget.org/v2/resources/${resourceId}/versions/latest`
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
			const data = await fs.readFile("index.json", "utf8");
			const indexData = JSON.parse(data);
			// Check if the plugin already exists in index.json

			const existingPlugin = indexData.plugins.find(
				(plugin) => plugin.plugin_id === resourceId
			);

			if (existingPlugin) {
				existingPlugin.plugin_latest_version = versionData.name;
				existingPlugin.plugin_is_outdated = false; // Placeholder, you can implement logic to check if outdated
			} else {
				console.log(chalk.green(`Adding new plugin "${name}" to index.json.`));
				// Add the new plugin to the index.json
				indexData.plugins.push({
					plugin_name: name,
					plugin_id: resourceId,
					plugin_file_name: fileName,
					plugin_latest_version: versionData.name,
					plugin_is_outdated: false, // Placeholder, you can implement logic to check if outdated
					plugin_repository: `https://www.spigotmc.org/resources/${resourceId}/`,
				});
			}
			// Write to index.json
			await fs.writeFile("index.json", JSON.stringify(indexData, null, 2));
			console.log(chalk.green(`Plugin "${name}" added to index.json.`));
			return indexData.plugins[0]; // Return the added plugin data
		} else {
			console.log(
				chalk.yellow(`Spigot plugin "${pluginName}" not found in search.`)
			);
			return null;
		}
	} catch (error) {
		console.error(
			chalk.red(`Error fetching Spigot plugin version for "${pluginName}":`),
			error
		);
		return null;
	}
};

const displayPluginTable = async () => {
	try {
		const data = await fs.readFile("index.json", "utf8");
		const indexData = JSON.parse(data);

		// Prepare the table data.
		const tableData = [
			[
				chalk.bold("No."),
				chalk.bold("Name"),
				chalk.bold("File Name"),
				chalk.bold("ID"),
				chalk.bold("Installed V."),
				chalk.bold("Latest V."),
				chalk.bold("Update available"),
				chalk.bold("Repository"),
			], // Table header
		];

		let pluginNumber = 1;
		// Iterate through each platform and its plugins.
		for (const platform in indexData) {
			if (indexData.hasOwnProperty(platform)) {
				const plugins = indexData[platform];
				for (const plugin of plugins) {
					tableData.push([
						pluginNumber++,
						plugin.plugin_name,
						plugin.plugin_file_name,
						plugin.plugin_id,
						plugin.plugin_file_version,
						plugin.plugin_latest_version,
						plugin.plugin_is_outdated ? chalk.red("True") : chalk.green("False"), // Colorize
						plugin.plugin_repository,
					]);
				}
			}
		}

		// Configure table style
		const tableConfig = {
			border: {
				topBody: "─",
				topJoin: "┬",
				topLeft: "┌",
				topRight: "┐",
				bottomBody: "─",
				bottomJoin: "┴",
				bottomLeft: "└",
				bottomRight: "┘",
				bodyLeft: "│",
				bodyRight: "│",
				bodyJoin: "│",
				joinLeft: "├",
				joinRight: "┤",
				joinBody: "─",
				joinJoin: "┼",
			},
		};

		// Output the table
		console.log(table(tableData, tableConfig));
	} catch (error) {
		console.error(chalk.red("Error reading index.json:"), error);
		throw error; // Re-throw to be handled by the caller
	}
};
