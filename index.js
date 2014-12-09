'use strict';

var debug = require('debug')('licenses::parse')
  , opensource = require('./opensource')
  , async = require('async');

/**
 * Start searching for license information for the given module path.
 *
 * @param {{
 *  path: String,
 *  data: Object
 * }} dep Absolute path to installed modules AND the package.json contents.
 * @param {Function} fn Callback.
 * @api public
 */
function parse(dep, fn) {
  var options = {};
  options.order = ['packagejson', 'filesystem', 'content'];

  async.waterfall([
    //
    // Search for the correct way of parsing out the license information.
    //
    function search(next) {
      if (!options.order.length) return next();
      if (Array.isArray(dep)) dep = dep[0];

      debug('searching for licensing information for %s', dep.data.name);

      var parser, result, name;

      async.doWhilst(function does(next) {
        name = options.order.shift();
        parser = parse.parsers[name];

        debug('attempting to extract the license information using: %s', name);

        parser.parse(dep, function parsed(err, license) {
          if (err) return next();

          result = license;
          if (result) debug('parsing with %s was successful', name);

          next();
        });
      }, function select() {
        return !result && options.order.length;
      }, function cleanup(err) {
        options = null;
        next(err, result, name);
      });
    }
  ], fn);
}

/**
 * Retrieve addition license information based on the returned results. The
 * returned object can contain the following properties
 *
 * - full: A human readable but long string of the license name.
 * - name: The same name as you already provided.
 * - id: An uppercase unique ID of the license.
 *
 * - file *optional*: The name of license file's content.
 * - url *optional*: The location where people can read the terms.
 *
 * @param {String} name The name of the license.
 * @returns {Object|Undefined}
 * @api public
 */
parse.info = function info(name) {
  return opensource.licenses[name];
};

//
// Expose the Parser class so we easily add new parsers through third-party if
// needed. (Think bitbucket and other code hosting sites)
//
parse.Package   = require('./packagejson');   // Parse license out of package
parse.Content   = require('./content');    // Parse license of out file content.
parse.Parser    = require('./parser');     // Base parser class.
parse.FileSystem    = require('./filesystem'); // Parse license info from filesystem.

//
// Expose our primary parsers that we can leverage to retrieve license content.
//
parse.parsers = {};
parse.parsers.packagejson      = new parse.Package(parse.parsers);
parse.parsers.content          = new parse.Content(parse.parsers);
parse.parsers.filesystem       = new parse.FileSystem(parse.parsers);

//
// Expose the actual module.
//
module.exports = parse;
