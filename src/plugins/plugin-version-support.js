const fs = require("fs").promises;
const chalk = require("chalk");

async function spigotSupportedVersions(pluginID) {
	try {
		const Response = await fetch(
			`https://api.spiget.org/v2/resources/${pluginID}`
		);
		// console.log(Response);
		if (!Response.ok) {
			return;
		}
		const versionData = await Response.json();
		const supportedVersions = versionData.testedVersions;
		if (supportedVersions && supportedVersions.length > 0) {
			const latestVersion = supportedVersions[supportedVersions.length - 1];
			return latestVersion;
		} else {
			// console.log(chalk.yellow(`No minecraft versions found for "${pluginID}".`));
			return;
		}
	} catch (error) {
		return [];
	}
}

//Get supported Minecraft versions from Modrinth API
async function modrinthSupportedVersions(pluginID) {
	try {
		const Response = await fetch(
			`https://api.modrinth.com/v2/project/${pluginID}/version`
		);
		const data = await Response.json();
        //get the latest version from the array of versions
        if (!Response.ok) {
            return;
        }
		const compatibleVersion = data.find((version) =>
			version.loaders.some(
				(loader) => loader === "bukkit" || loader === "spigot" || loader === "paper"
			)
		);
        if(!compatibleVersion) {
            return;
        }

        // console.log(versionData);
        
		const supportedVersions = compatibleVersion.game_versions;
		if (supportedVersions && supportedVersions.length > 0) {
			// console.log(supportedVersions);
			const latestVersion = supportedVersions[supportedVersions.length - 1];
			return latestVersion;
		} else {
			return;
		}
	} catch (error) {
		return;
	}
}

module.exports = {
	spigotSupportedVersions,
	modrinthSupportedVersions,
};
