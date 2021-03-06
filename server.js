#!/usr/bin/env node

/* eslint no-console: off */
const path = require("path");
const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const charon = require("./src/server/charon");
const globals = require("./src/server/globals");
const compression = require('compression');
const argparse = require('argparse');
const version = require('./src/version').version;

const parser = new argparse.ArgumentParser({
  version: version,
  addHelp: true,
  description: `Auspice version ${version}.`,
  epilog: `
  Auspice is an open-source interactive web app for visualising phylogenomic data.
  This command starts the server, which will make visualisations available in your browser.
  See nextstrain.org/docs/visualisation/introduction or github.com/nextstrain/auspice
  for more details.
  `
});
if (!globals.isNpmGlobalInstall()) {
  parser.addArgument('--dev', {action: "storeTrue", help: "Run (client) in development mode (hot reloading etc)"});
}
parser.addArgument('--data', {help: "Directory where local datasets are sourced"});
parser.addArgument('--narratives', {help: "Directory where local narratives are sourced"});
const args = parser.parseArgs();

/* documentation in the static site! */
globals.setGlobals(args);

const app = express();
app.set('port', process.env.PORT || 4000);
app.use(compression());

if (args.dev) {
  /* if we are in dev-mode, we need to import specific libraries & set up hot reloading */
  const webpack = require("webpack"); // eslint-disable-line
  const webpackConfig = require(process.env.WEBPACK_CONFIG ? process.env.WEBPACK_CONFIG : './webpack.config.dev');  // eslint-disable-line
  const compiler = webpack(webpackConfig);
  app.use(require("webpack-dev-middleware")( // eslint-disable-line
    compiler,
    {logLevel: 'warn', publicPath: webpackConfig.output.publicPath}
  ));
  app.use(require("webpack-hot-middleware")( // eslint-disable-line
    compiler,
    {log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000}
  ));
} else {
  app.use("/dist", expressStaticGzip(path.resolve(__dirname, "dist")));
  app.use(express.static(path.resolve(__dirname, "dist")));
}

/* redirect www.nextstrain.org to nextstrain.org */
app.use(require('express-naked-redirect')({reverse: true}));

app.get("/favicon.png", (req, res) => {
  res.sendFile(path.resolve(__dirname, "favicon.png"));
});

charon.applyCharonToApp(app);

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

const server = app.listen(app.get('port'), () => {
  console.log("-----------------------------------");
  console.log("Auspice server now running at http://localhost:" + server.address().port);
  if (args.dev) console.log(`*** DEVELOPMENT MODE ***`);
  console.log(`Local datasets at http://localhost:${server.address().port}/local are sourced from ${global.LOCAL_DATA_PATH}`);
  console.log(`Local narratives at http://localhost:${server.address().port}/local/narratives are sourced from ${global.LOCAL_NARRATIVES_PATH}`);
  console.log("-----------------------------------\n\n");
});
