'use strict';

var debug = require('debug')('licenses::github')
  , fs = require('fs')
  , SLASH = require('path').sep;

/**
 * Parser for absolute path on filesystem.
 *
 * @constructor
 * @api public
 */
module.exports = require('./parser').extend({
  /**
   * The name of this parser.
   *
   * @type {String}
   * @private
   */
  name: 'filesystem',

  /**
   * All the filenames that we're interested in that can potentially
   * contain the license information.
   *
   * @type {Array}
   * @api private
   */
  filenames: [
    'license',
    'licence',
    'readme'
  ].concat([
    'markdown', 'mdown', 'md', 'textile', 'rdoc', 'org', 'creole', 'mediawiki',
    'rst', 'asciidoc', 'adoc', 'asc', 'pod'
  ].reduce(function flatten(slim, extension) {
    slim.push('license.'+ extension, 'readme.'+ extension, 'licence.'+ extension);
    return slim;
  }, [])),

  /**
   * Parse the information from the package.
   *
   * @param {{
   *  path: String,
   *  data: Object
   * }} dep Absolute path to installed modules AND the package.json contents.
   * @param {Function} next Continuation.
   * @api public
   */
  parse: function parse(dep, next) {
    //
    // We cannot detect a license so we call the callback without any arguments
    // which symbolises a failed attempt.
    //
    if (!dep) return next();

    var parser = this;

    fs.readdir(dep.path, function (err, files) {
      if (err || !files || !files.length) return next(err);

      //
      // Check if we have any compatible.
      //
      files = files.filter(function filter(file) {
        var name = file.toLowerCase();

        // Fast case, direct match.
        if (!!~parser.filenames.indexOf(name)) return true;

        // Slow case, partial match.
        return parser.filenames.some(function some(filename) {
          return !!~name.indexOf(filename);
        });
      }).sort(function sort(a, b) {
        if (a.name > b.name) return 1;
        if (b.name < b.name) return -1;
        return 0;
      }).map(function(file) {
        return dep.path + SLASH + file;
      });

      if (!files.length) return next();

      //
      // Stored the matching license.
      //
      var license;

      //
      // Fetch and parse the 'raw' content of the file so we can parse it.
      //
      parser.async.doWhilst(function does(next) {
        var file = files.shift();

        debug('searching %s for license information', file);

        fs.readFile(file, {encoding: 'UTF8'}, function raw(err, data) {
          if (err) return next(err);

          parser.parsers.content.parse({
            content: Array.isArray(data) ? data[0] : data,
            file: file
          }, function parse(err, data) {
            license = data;

            if (license) debug('extracted %s from %s', data, file);
            next(err);
          });
        });
      }, function select() {
        return !license && files.length;
      }, function done(err) {
        next(err, license);
      });
    });

  }
});
