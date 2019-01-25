#!/bin/bash -e
# Ensure a vanilla package.json before deploying so other tools do not interpret
# The built output as requiring any further transformation.
node -e "var package = require('./package.json'); \
  delete package.private; \
  delete package.scripts; \
  delete package.options; \
  delete package.devDependencies; \
  var origVersion = 'local';
  var fs = require('fs'); \
  fs.writeFileSync('./lib/package.json', JSON.stringify(package, null, 2)); \
  "

# Copy few more files to ./lib
cp README.md lib/
cp LICENSE lib/
cp .npmignore lib/
