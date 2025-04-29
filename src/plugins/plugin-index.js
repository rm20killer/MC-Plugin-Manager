const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { table } = require("table");
const cliProgress = require("cli-progress");
const supportedVersions = require("./plugin-version-support.js");
const { json } = require("stream/consumers");
const config = require("../config");

// const config = require("../config.yaml");
async function IndexFolder(shouldskip) {
	const PathToPluginFolder = path.join(await config.GetServerPath(), "plugins");

	// const PathToPluginFolder = "D:/server/minecraft/1.21/testing/plugins";
	// const PathToPluginFolder = "D:/server/server manager/servers/1.12.5 testing/plugins";
	const FileName = ".index.json";

	let skip = false;

	if (shouldskip) {
		skip = true;
	}

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
	const indexFilePath = path.join(PathToPluginFolder, FileName);
	let indexData = { plugins: [] };
	//loop through the files and index them by searching them on spigot
	for (const file of pluginFiles) {
		try {
			let pluginName = file.split(/[_-]/)[0];
			//if file.split(/[_-]/)[1] does not contain a number with more then 3 letters, include it in the plugin name
			if (
				file.split(/[_\-\.]/)[1] != undefined &&
				file.split(/[_\-\.]/)[1] &&
				/^[a-zA-Z]+$/.test(file.split(/[_\-\.]/)[1])
			) {
				pluginName += " " + file.split(/[_\-\.]/)[1];
			}
			//remove .jar from the file name
			pluginName = pluginName.replace(".jar", "");
			pluginName = pluginName.replace(" jar", "");
			// version should be the file name not including the plugin name and the .jar there may be multiple - after the first one
			const version = file.split(/[_-]/).slice(1).join("-").replace(".jar", "");

			//remove any letters from the version string
			let versionNumber = version.replace(/[^0-9.]/g, "");
			//if versionNumber has a . at the start, remove it
			if (versionNumber.startsWith(".")) {
				versionNumber = versionNumber.substring(1);
			}

			//check if the plugin is already in the index.json file
			const existingPlugin = indexData.plugins.find(
				(plugin) => plugin.plugin_name === pluginName
			);
			if (!existingPlugin) {
				let pluginData = await spigotCheck(pluginName);
				if (pluginData) {
					let newVersionNumber = await spigotCheckVersion(pluginData.id);
					indexData.plugins.push({
						plugin_name: pluginName,
						plugin_id: pluginData.id,
						plugin_file_name: file,
						plugin_file_version: versionNumber,
						plugin_latest_version: newVersionNumber,
						plugin_supported_versions:
							await supportedVersions.spigotSupportedVersions(pluginData.id),
						plugin_is_outdated: CheckVersion(versionNumber, newVersionNumber),
						plugin_repository: `https://www.spigotmc.org/resources/${pluginData.id}/`,
					});
					//modrinth check
				} else {
					let pluginData = await ModrinthCheck(pluginName);
					if (pluginData) {
						let newVersionNumber = await ModrinthCheckVersion(pluginData.project_id);
						indexData.plugins.push({
							plugin_name: pluginData.title,
							plugin_id: pluginData.project_id,
							plugin_file_name: file,
							plugin_file_version: versionNumber,
							plugin_latest_version: newVersionNumber,
							plugin_supported_versions:
								await supportedVersions.modrinthSupportedVersions(
									pluginData.project_id
								),
							plugin_is_outdated: CheckVersion(versionNumber, newVersionNumber),
							plugin_repository: `https://modrinth.com/plugin/${pluginData.project_id}`,
						});
					} else {
						let data = await GetUserPlugins(pluginName);
						if (data && data.plugin_name) {
							let lastVersion;
							if (data.plugin_repository.includes("spigotmc.org")) {
								lastVersion = await spigotCheckVersion(data.plugin_id);
							} else if (data.plugin_repository.includes("modrinth.com")) {
								lastVersion = await ModrinthCheckVersion(data.plugin_id);
							}
							if (!versionNumber) {
								versionNumber = "0.0.0";
							}
							let pluginData = {
								plugin_name: pluginName,
								plugin_id: data.plugin_id,
								plugin_file_name: file,
								plugin_file_version: versionNumber,
								plugin_latest_version: lastVersion,
								plugin_is_outdated: CheckVersion(versionNumber, lastVersion),
								plugin_repository: data.plugin_repository,
							};
							indexData.plugins.push(pluginData);
						} else {
							console.log(chalk.red(` | Plugin "${pluginName}" not found`));
							if (!skip) {
								let data = await AddUserLink(pluginName, file, versionNumber);
								if (data) {
									let lastVersion = await spigotCheckVersion(data.plugin_id);
									if (!versionNumber) {
										versionNumber = "0.0.0";
									}
									let pluginData = {
										plugin_name: pluginName,
										plugin_id: data.plugin_id,
										plugin_file_name: file,
										plugin_file_version: versionNumber,
										plugin_latest_version: lastVersion,
										plugin_is_outdated: CheckVersion(versionNumber, lastVersion),
										plugin_repository: data.plugin_repository,
									};
									indexData.plugins.push(pluginData);
									AddToStorage(pluginData);
								} else {
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
							} else {
								//if skip is true, just add the plugin to the index.json file with the plugin name and file name only
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
	console.log(output);
	console.log(chalk.white(totalPlugins + " plugins total."));
}

async function spigotCheck(pluginName) {
	try {
		const response = await fetch(
			`https://api.spiget.org/v2/search/resources/${encodeURIComponent(
				pluginName
			)}?fields=id,name`
		);
		const data = await response.json();
		if (Array.isArray(data) && data.length > 0) {
			for (const result of data) {
				// Loop through the results
				if (result.name) {
					// Get the first word of the plugin name from the filename
					const firstWordPlugin = pluginName.toLowerCase().split(/[^a-z0-9]/)[0];
					// Get the first word of the Spiget result's name
					const firstWordResult = result.name.toLowerCase().split(/[^a-z0-9]/)[0];

					// Check if the first words match
					if (
						firstWordPlugin &&
						firstWordResult &&
						firstWordPlugin === firstWordResult
					) {
						return result;
					}
				}
			}
			return null;
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
			// Check the first result first
			const firstResult = data.hits[0];
			if (
				firstResult.server_side === "required" &&
				(firstResult.categories.includes("bukkit") ||
					firstResult.categories.includes("spigot") ||
					firstResult.categories.includes("paper"))
			) {
				if (firstResult.title) {
					const firstWordPlugin = pluginName.toLowerCase().split(/[^a-z0-9]/)[0];
					const firstWordResult = firstResult.title
						.toLowerCase()
						.split(/[^a-z0-9]/)[0];

					if (
						firstWordPlugin &&
						firstWordResult &&
						firstWordPlugin === firstWordResult
					) {
						return firstResult; // Return the first result if it matches
					}
				}
				// Return the first result even if the title doesn't match the first word
				return firstResult;
			}

			// If the first result doesn't match, loop through the rest
			for (let i = 1; i < data.hits.length; i++) {
				const pluginData = data.hits[i];
				if (
					pluginData.server_side === "required" &&
					(pluginData.categories.includes("bukkit") ||
						pluginData.categories.includes("spigot") ||
						pluginData.categories.includes("paper"))
				) {
					if (pluginData.title) {
						const firstWordPlugin = pluginName.toLowerCase().split(/[^a-z0-9]/)[0];
						const firstWordResult = pluginData.title
							.toLowerCase()
							.split(/[^a-z0-9]/)[0];

						if (
							firstWordPlugin &&
							firstWordResult &&
							firstWordPlugin === firstWordResult
						) {
							return pluginData; // Return the first matching result
						}
					}
					return pluginData;
				}
			}
		} else {
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
async function GetModrinthVersionID(pluginID) {
	try {
		const response = await fetch(
			`https://api.modrinth.com/v2/project/${pluginID}/version`
		);
		const data = await response.json(); //get the first version that is compatible with bukkit, spigot or paper
		const compatibleVersion = data.find((version) =>
			version.loaders.some(
				(loader) => loader === "bukkit" || loader === "spigot" || loader === "paper"
			)
		);
		if (compatibleVersion) {
			return compatibleVersion.id;
		}
	} catch (error) {
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
				(loader) => loader === "bukkit" || loader === "spigot" || loader === "paper"
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
	if (!oldVersion || !newVersion) {
		return null;
	}
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

function AddUserLink(plugin_name, file, versionnumber) {
	console.log(
		chalk.white("Could not find a spigot or Modrinth link for: " + plugin_name)
	);
	//ask the user to add a link to the plugin
	return new Promise(async (resolve) => {
		const link = await new Promise((resolve) => {
			global.readline.question(
				chalk.white(`Please enter a link for ${plugin_name} (or type 'skip'): `),
				resolve
			);
		});
		global.readline.pause();
		//if the link is empty, return
		if (link === "") {
			resolve(null);
			return null;
		}
		//check if the link is a valid url
		const urlRegex = /^(http|https):\/\/[^ "]+$/;
		if (urlRegex.test(link)) {
			//psigot check
			if (link.includes("spigotmc.org/resources/")) {
				const result = await UserSpigotCheck(
					plugin_name,
					link,
					file,
					versionnumber
				);
				resolve(result);
				return;
			}
			//Modrinth check
			if (link.includes("modrinth.com/")) {
				const result = UserModrinthCheck(plugin_name, link, file, versionnumber);
				resolve(result);
				return;
			}
			//github link
			if (link.includes("github.com/")) {
				const result = UserGithubCheck(plugin_name, link, file, versionnumber);
				resolve(result);
				return;
			}

			let data = {
				plugin_name: plugin_name,
				plugin_id: null,
				plugin_file_name: file,
				plugin_file_version: versionnumber,
				plugin_latest_version: null,
				plugin_supported_versions: null,
				plugin_is_outdated: null,
				plugin_repository: link,
			};
			resolve(data);
			return;
		} else {
			console.log(chalk.red("Invalid link. Please try again."));
			return await AddUserLink(plugin_name);
		}
	});
}

async function UserSpigotCheck(plugin_name, link, file, versionnumber) {
	//https://www.spigotmc.org/resources/premium-warps-portals-and-more-warp-teleport-system-1-8-1-21-1.66035/
	//to plugin id is the last number in the link after the .
	const parts = link.split("/");
	const lastPartWithId = parts[parts.length - 2]; // Access the second to last part
	const pluginID = lastPartWithId.split(".").pop();
	console.log(pluginID);
	//quick api call to check if the plugin id is valid
	let response = await fetch(`https://api.spiget.org/v2/resources/${pluginID}`);
	let data = {
		plugin_name: plugin_name,
		plugin_id: pluginID,
		plugin_file_name: file,
		plugin_file_version: versionnumber,
		plugin_latest_version: null,
		plugin_supported_versions: null,
		plugin_is_outdated: null,
		plugin_repository: link,
	};
	if (!response.ok) {
		console.error(
			chalk.red(
				`Spiget API error (version): ${response.status} - ${response.statusText}`
			)
		);
		return data;
	}
	response = await response.json();
	let lastVersion = await spigotCheckVersion(pluginID);
	if (!versionnumber) {
		versionnumber = "0.0.0";
	}

	data = {
		...data,
		plugin_latest_version: lastVersion,
		plugin_supported_versions: await supportedVersions.spigotSupportedVersions(
			pluginID
		),
		plugin_is_outdated: CheckVersion(versionnumber, lastVersion),
		plugin_repository: `https://www.spigotmc.org/resources/${pluginID}/`,
	};
	return data;
}

async function UserModrinthCheck(plugin_name, link, file, versionnumber) {
	//https://modrinth.com/plugin/geyser
	//slug is the last part of the link after the /
	const slug = link.split("/").pop();
	//quick api call to check if the plugin id is valid
	let response = await fetch(`https://api.modrinth.com/v2/project/${slug}`);
	let data = {
		plugin_name: plugin_name,
		plugin_id: slug,
		plugin_file_name: file,
		plugin_file_version: versionnumber,
		plugin_latest_version: null,
		plugin_supported_versions: null,
		plugin_is_outdated: null,
		plugin_repository: link,
	};
	//if the response is not ok, return null
	if (!response.ok) {
		console.error(
			chalk.red(
				`Modrinth API error (version): ${response.status} - ${response.statusText}`
			)
		);
		return data;
	}
	response = await response.json();
	let pluginID = response.id;
	let lastVersion = await GetModrinthVersionID(pluginID);
	if (!versionnumber) {
		versionnumber = "0.0.0";
	}
	data = {
		...data,
		plugin_id: pluginID,
		plugin_latest_version: lastVersion,
		plugin_supported_versions: await supportedVersions.modrinthSupportedVersions(
			pluginID
		),
		plugin_is_outdated: CheckVersion(versionnumber, lastVersion),
		plugin_repository: `https://modrinth.com/plugin/${pluginID}`,
	};
	return data;
}

async function UserGithubCheck(plugin_name, link, file, versionnumber) {
	//https://github.com/rm20killer/MCFireworkshow
	//id = the last part of the link after github.com/
	const id = link.split("/").pop();

	let data = {
		plugin_name: plugin_name,
		plugin_id: id,
		plugin_file_name: file,
		plugin_file_version: versionnumber,
		plugin_latest_version: null,
		plugin_supported_versions: null,
		plugin_is_outdated: null,
		plugin_repository: link,
	};
	return data;
}

async function AddToStorage(data) {
	const file = "UserPlugins.json";
	//check if the file exists in if not create it
	const filePath = path.join(__dirname, "..", "..", file);

	const dataFile = await fs.readFile(filePath, "utf8");
	const jsonData = JSON.parse(dataFile);
	// Check if the plugin already exists in the UserPlugins.json file
	const existingPlugin = jsonData.plugins.find(
		(plugin) => plugin.plugin_name === data.plugin_name
	);
	let plguin = {
		plugin_name: data.plugin_name,
		plugin_id: data.plugin_id,
		plugin_repository: data.plugin_repository,
	};

	if (existingPlugin) {
		// Update the existing plugin data
		existingPlugin.plugin_id = data.plugin_id;
		existingPlugin.plugin_repository = data.plugin_repository;
	} else {
		// Add the new plugin to the UserPlugins.json file
		jsonData.plugins.push(plguin);
	}
	// console.log(jsonData.plugins);
	// Write the updated data back to the file
	await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
	return jsonData.plugins[0]; // Return the added plugin data
}

async function GetUserPlugins(plugin_name) {
	const file = "UserPlugins.json";
	const filePath = path.join(__dirname, "..", "..", file);

	const dataFile = await fs.readFile(filePath, "utf8");
	const jsonData = JSON.parse(dataFile);
	if (jsonData.plugins.length === 0) {
		return null;
	}
	// Check if the plugin already exists in the UserPlugins.json file
	const existingPlugin = jsonData.plugins.find(
		(plugin) => plugin.plugin_name === plugin_name
	);
	if (existingPlugin) {
		return existingPlugin;
	} else {
		return null; // Plugin not found
	}
}

module.exports = {
	IndexFolder,
	CheckVersion,
	ModrinthCheckVersion,
	spigotCheckVersion,
};
