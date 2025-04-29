# MC-Plugin-Manager
A node JS based plugin manager to help check and update plugins for multiple different servers.

This is still work in progress with things subject to change.

Currently supports Paper/spigot plugins with plans on adding in velocity and bungee.

Can only download plugins and check for updates from spigot and modrinth. Plan on adding support for github package later on as well. 

## Requirements 
[Node JS 18](https://nodejs.org/en/download)
or
```powershell
# Download and install fnm:
winget install Schniz.fnm
# Download and install Node.js:
fnm install 18
# Verify the Node.js version:
node -v # Should print "v18.20.8".
# Verify npm version:
npm -v # Should print "10.8.2".
```
## Setup
1) Download source
2) run `npm i`
3) in `UserPlugins.json` change to your server
4) Run with `node index.js`

## Available commands:
   - help                           - To see this message again.
   - server <list|set>              - To set the server to use.
   - index                          - To automatically index plugins Adding "-s" to skip user inputs
   - check                          - Check for updates for all plugins
   - list                           - To list all plugins in the index.
   - update                         - To download all outdated plugins.
   - download <plugin name>         - To download a plugin.
   - download all                   - To download all plugins.
   - exit                           - To quit the application.
