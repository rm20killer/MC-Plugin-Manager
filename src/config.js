const path = require("path");
const configFile = require("../config");
const fs = require("fs");
const chalk = require("chalk");
const { version } = require("os");

let config = null;
let selectedServer;
let selectedServerName;
let selectedServerType;
let selectedServerVersion;
let selectedServerPath;

async function GetServer() {
	if (!selectedServer) {
		//get config file
		config = configFile;
		selectedServer = config.SelectedServer;
		selectedServerName = config.servers[selectedServer].name;
		selectedServerType = config.servers[selectedServer].ServerType;
		selectedServerVersion = config.servers[selectedServer].ServerVersion;
		selectedServerPath = config.servers[selectedServer].folderPath;
	}

	return {
		name: selectedServerName,
		type: selectedServerType,
		version: selectedServerVersion,
		ServerPath: selectedServerPath,
	};
}

async function GetServerPath() {
	return selectedServerPath;
}

async function GetSelectedServer() {
	return selectedServer;
}

async function SetServer(serverName) {
	let selectedIndex = -1;
	for (let i = 0; i < config.servers.length; i++) {
		if (config.servers[i].name === serverName) {
			selectedIndex = i;
			break;
		}
	}

	if (selectedIndex !== -1) {
		selectedServer = selectedIndex; // Store the index
		selectedServerName = config.servers[selectedServer].name;
		selectedServerType = config.servers[selectedServer].ServerType;
		selectedServerVersion = config.servers[selectedServer].ServerVersion;
		selectedServerPath = config.servers[selectedServer].folderPath;
		console.log(
			chalk.green(
				`Successfully set server at index ${selectedServer} ("${selectedServerName}").`
			)
		);
	} else {
		console.log(chalk.red(`Server "${serverName}" not found in config.`));
	}
}

async function GetServerList() {
	return config.servers;
}

async function SetServerIndex(index) {
	if (config.servers[index]) {
		selectedServer = index;
		selectedServerName = config.servers[selectedServer].name;
		selectedServerType = config.servers[selectedServer].type;
		selectedServerVersion = config.servers[selectedServer].version;
		selectedServerPath = config.servers[selectedServer].path;
		console.log(
			chalk.green(
				`Successfully set server at index ${selectedServer} ("${selectedServerName}").`
			)
		);
	} else {
		SetServer(index);
	}
}
async function AddServer() {
    //TODO: Fix this
    //No idea what i have done or why it dont work
	global.readline.resume();
	console.log(chalk.white("Adding new server to list"));
	console.log(
		chalk.white(
			"The Path should be in the format 'D:/server/minecraft/1.21/testing/'"
		)
	);
	console.log(
		chalk.white(
			"This is where paper.jar, server config folder, plugin folder, etc are located "
		)
	);
	const ServerPath = await new Promise((resolve) => {
		global.readline.question(
			chalk.yellow("Enter then path for the folder: "),
			(answer) => {
				resolve(answer);
			}
		);
	});

	const pathParts = ServerPath.split(/[/\\]+/); // Split by forward or backslashes
	const name = pathParts[pathParts.length - 2] || ""; // Get the second to last part
	//look to see if there is a file that contains "paper" and ends with .jar in path
	const fs = require("fs").promises;
	const pathModule = require("path");

	let ServerJarFile = null;
	let ServerVersion = null;
	let pluginsFolderExists = false;
	try {
		const files = await fs.readdir(ServerPath);
		for (const file of files) {
			if (file.includes("paper") && file.endsWith(".jar")) {
				ServerJarFile = file;
			} else if (item.isDirectory() && item.name === "plugins") {
				pluginsFolderExists = true;
			}
		}
		if (!pluginsFolderExists) {
			console.log(chalk.error(`No "plugins" folder found aborting.`));
			return;
		}
		if (ServerJarFile) {
			console.log(chalk.green(`Found Paper JAR file: ${ServerJarFile}`));
			//paperJarFile = paper-1.21.3-82
			ServerVersion = paperJarFile.split("-")[1];
			if (!ServerVersion) {
				ServerVersion = await new Promise((resolve) => {
					global.readline.question(chalk.yellow("Enter MC version: "), (answer) => {
						resolve(answer);
					});
				});
			}
		} else {
			console.log(
				chalk.yellow("Warning: No Paper JAR file found in the specified path.")
			);
			ServerJarFile = await new Promise((resolve) => {
				global.readline.question(
					chalk.yellow("Enter Server type (paper/velocity): "),
					(answer) => {
						resolve(answer);
					}
				);
			});
		}

	} catch (error) {
		console.error(chalk.red(`Error reading directory: ${error}`));
	}
}

async function AddServer(serverName, serverType, serverVersion, serverPath) {
	if (config.servers[serverName]) {
		console.log(chalk.red(`Server "${serverName}" already exists in config.`));
	} else {
		config.servers[serverName] = {
			name: serverName,
			type: serverType,
			version: serverVersion,
		};
	}
}

async function RemoveServer(serverName) {
	if (config.servers[serverName]) {
		delete config.servers[serverName];
		console.log(chalk.green(`Server "${serverName}" removed from config.`));
	} else {
		console.log(chalk.red(`Server "${serverName}" not found in config.`));
	}
}

module.exports = {
	GetServer,
	GetServerPath,
	GetSelectedServer,
	SetServer,
	GetServerList,
	AddServer,
	RemoveServer,
	SetServerIndex,
};
