# CocoaCut plugins

Plugins for CocoaCut, the browser video editor. Open **Tools → Plugins → Browse plugins** in the app to install them.

In the app, paste this repository's link into the Catalogue field once. CocoaCut checks every download against the checksum in `index.json` before showing the install screen.

## Adding a plugin

1. Copy your plugin to `plugins/<your-id>.cocoa.js`. Start it with the CocoaCut header (`@id`, `@name`, `@version`, `@description`, `@permissions`).
2. Run `python3 update-index.py`. It rebuilds `index.json` from the plugin headers and records each file's SHA-256 checksum.
3. Open a pull request. A maintainer reviews the code before merging.

Plugins run sealed off by default: no internet, no files, and only the permissions they list. Plugins with `"access": "full"` can do anything in the app, so they need an explicit extra review.
