const figlet = require("figlet");
const readline = require("readline").createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: ">>> ",
});
global.readline = readline;
const fs = require("fs").promises;
const chalk = require("chalk");
const plugin = require("./src/plugin.js");
const pluginDownload = require("./src/plugin-download.js");
const index = require("./src/plugin-index.js");

const greet = () => {
	return new Promise((resolve) => {
		figlet("PlugManager", function (err, data) {
			if (err) {
				console.log("Something went wrong...");
				console.dir(err);
				resolve();
				return;
			}
			console.log(chalk.white(data));
			console.log(
				chalk.cyanBright(
					"·························-= By RM20 =-·························"
				)
			);
			//   "·························-= By RM20 =-·························"
			//   "                      Welcome to PlugManager!"
			//   "                A simple CLI for managing plugins."
			console.log(chalk.white("                      Welcome to PlugManager!"));
			console.log(
				chalk.white("                A simple CLI for managing plugins.")
			);
			console.log(
				chalk.cyanBright(
					"---------------------------------------------------------------"
				)
			);
			info();
			resolve();
		});
	});
};

const info = () => {
	console.log(chalk.white("Available commands:"));

	console.log(
		chalk.white("  "),
		chalk.cyanBright("help".padEnd(30)),
		chalk.white("- To see this message again.")
	);
	console.log(
		chalk.white("  "),
		chalk.cyanBright("index".padEnd(30)),
		chalk.white("- To automatically index plugins")
	);
	console.log(
		chalk.white("  "),
		chalk.cyanBright("add <platform> <plugin name>".padEnd(30)),
		chalk.white("- To add a plugin to the index.")
	);
	console.log(
		chalk.white("  "),
		chalk.cyanBright("list".padEnd(30)),
		chalk.white("- To list all plugins in the index.")
	);
	console.log(
		chalk.white("  "),
		chalk.cyanBright("update".padEnd(30)),
		chalk.white("- To update all outdated plugins.")
	);
	console.log(
		chalk.white("  "),
		chalk.cyanBright("download <plugin name>".padEnd(30)),
		chalk.white("- To download a plugin.")
	);
	console.log(
		chalk.white("  "),
		chalk.cyanBright("download all".padEnd(30)),
		chalk.white("- To download all plugins.")
	);
	console.log(
		chalk.white("  "),
		chalk.cyanBright("exit".padEnd(30)),
		chalk.white("- To quit the application.")
	);
	console.log(
		chalk.cyanBright(
			"---------------------------------------------------------------"
		)
	);
};

const handleCommand = async (input) => {
	readline.pause();
	const parts = input.trim().split(/\s+/);
	const command = parts[0];
	const args = parts.slice(1);

	const commands = {
		help: info,
		add: async () => {
			if (args.length >= 2) {
				const platform = args[0].toLowerCase();
				const pluginNameParts = args.slice(1);
				const pluginName = pluginNameParts.join(" ");
				await plugin.addPlugin(platform, pluginName);
			} else {
				console.log(chalk.red("Usage: add <platform> <plugin name>"));
			}
		},
		a: "add",
		list: async () => {
			if (args.length >= 1) {
				//arg is plugin_supported_versions for example 1.21.4
				//get all plugins with that version or higher
				const version = args[0];
				const parts = version.split(".").map(Number);
				const major = parts[0];
				const minor = parts[1];
				const patch = parts[2];

				const data = await fs.readFile("index.json", "utf8");
				const indexData = JSON.parse(data);
				const filteredPlugins = indexData.plugins.filter((plugin) => {
					if (!plugin.plugin_supported_versions) return false;
					const pluginParts = plugin.plugin_supported_versions
						.split(".")
						.map(Number);
					const pluginMajor = pluginParts[0];
					const pluginMinor = pluginParts[1];
					const pluginPatch = pluginParts[2];

					if (parts.length === 3 && pluginParts.length === 3) {
						return (
							pluginMajor === major && pluginMinor === minor && pluginPatch >= patch
						);
					} else if (parts.length === 2 && pluginParts.length >= 2) {
						return pluginMajor === major && pluginMinor >= minor;
					} else if (parts.length === 1 && pluginParts.length >= 1) {
						return pluginMajor >= major;
					}
					return false; // Handle cases with different number of parts
				});

				if (filteredPlugins.length > 0) {
					console.log(chalk.white(`Plugins with version ${version} or higher:`));
					console.table(filteredPlugins);
				} else {
					console.log(
						chalk.red(`No plugins found with version ${version} or higher.`)
					);
				}
			} else {
				try {
					const data = await fs.readFile("index.json", "utf8");
					const indexData = JSON.parse(data);
					console.log(chalk.white("Plugins:"));
					console.table(indexData.plugins);
				} catch (error) {
					console.error(chalk.red("Error reading index.json:"), error);
				}
			}
		},
		download: async () => {
			if (args.length >= 1) {
				const pluginName = args.join(" ");
				if (pluginName === "all") {
					await pluginDownload.downloadAllPlugin();
				} else if (pluginName === "update") {
					await pluginDownload.UpdatePlugins();
				} else {
					await pluginDownload.downloadPlugin(pluginName);
				}
			} else {
				console.log(chalk.red("Usage: download <plugin name|all|update>"));
			}
		},
		dl: "download",
		update: async () => {
			await pluginDownload.UpdatePlugins();
		},
		u: "update",
		index: async () => {
			if (args.length >= 1) {
				if (args[0] === "-s") {
					await index.IndexFolder(true);
				} else {
					await index.IndexFolder(false);
				}
			} else {
				await index.IndexFolder(false);
			}
		},
		exit: () => {
			console.log(chalk.gray("Exiting PlugManager."));
			readline.close();
			process.exit(0); // Use process.exit() for a cleaner exit
		},
		quit: "exit",
	};

	try {
		const action = commands[command.toLowerCase()]; //handle case insensitivity
		if (action) {
			if (typeof action === "function") {
				await action();
			} else if (typeof action === "string") {
				await commands[action]();
			}
		} else {
			console.log(chalk.red(`Unknown command: ${command}`));
		}
	} catch (error) {
		console.error(chalk.red("Error processing command:"), error);
	} finally {
		readline.resume();
		readline.prompt();
	}
};

const main = async () => {
	await greet();
	readline.prompt();

	readline
		.on("line", (input) => {
			handleCommand(input);
		})
		.on("close", () => {
			process.exit(0);
		});
};

main().catch((error) => {
	console.error(chalk.red("Error in main function:"), error);
	readline.close();
	process.exit(1);
});
