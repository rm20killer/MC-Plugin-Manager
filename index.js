const figlet = require('figlet');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>>> ',
});
const fs = require('fs').promises;
const chalk = require('chalk');
const plugin = require('./src/plugin.js'); // Import the addPlugin function
const pluginDownload = require('./src/plugin-download.js'); // Import the downloadPlugin function
const index = require('./src/plugin-index.js'); // Import the search function

const greet = () => {
    return new Promise(resolve => {
        figlet('PlugManager', function (err, data) {
            if (err) {
                console.log('Something went wrong...');
                console.dir(err);
                resolve();
                return;
            }
            console.log(chalk.white(data));
            console.log(chalk.white('Welcome to PlugManager!'));
            console.log(chalk.white('A simple CLI for managing plugins.'));
            console.log(chalk.white('Type "add <platform> <plugin name>" to add a plugin to the index.'));
            console.log(chalk.white('Type "list" to list all plugins.'));
            console.log(chalk.white('Type "download <plugin name>" to download a plugin.'));
            console.log(chalk.white('Type "download all" to download all plugins.'));
            console.log(chalk.white('Type "index" to index plugins.'));
            console.log(chalk.white('Type "exit" to quit the application.'));
            console.log(chalk.cyanBright('----------------------------------------'));
    
            resolve();
        });
    });
};

const handleCommand = async (input) => {
    const parts = input.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
        case 'add':
            if (args.length >= 2) {
                const platform = args[0].toLowerCase();
                const pluginNameParts = args.slice(1);
                const pluginName = pluginNameParts.join(' ');
                await plugin.addPlugin(platform, pluginName);
            } else {
                console.log(chalk.red('Usage: add <platform> <plugin name>'));
            }
            break;
        case 'list':
            try {
                const data = await fs.readFile('index.json', 'utf8');
                const indexData = JSON.parse(data);
                console.log(chalk.green('Plugins:'));
                console.table(indexData.plugins); // Display the plugins in a table format
            } catch (error) {
                console.error(chalk.red('Error reading index.json:'), error);
            }
            break;
        case 'download':
            if (args.length >= 1) {
                const pluginName = args.join(' ');
                if (pluginName === 'all') {
                    await pluginDownload.downloadAllPlugin();
                }
                else
                {
                    await pluginDownload.downloadPlugin(pluginName);
                }
            } else {
                console.log(chalk.red('Usage: download <plugin name>'));
            }
            break;
        case 'index':
            await index.IndexFolder();
            break;
        case 'exit':
            console.log(chalk.gray('Exiting PlugManager.'));
            readline.close();
            break;
        default:
            console.log(chalk.red(`Unknown command: ${command}`));
    }
    readline.prompt(); // Show the prompt again for the next command
};



const main = async () => {
    await greet();
    readline.prompt(); // Show the initial prompt

    readline.on('line', (input) => {
        handleCommand(input);
    }).on('close', () => {
        process.exit(0);
    });
};

main();