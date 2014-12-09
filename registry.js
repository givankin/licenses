'use strict';

var debug = require('debug')('licenses::npm');
var readJson = require('../read-package-json');

/**
 * Parser for npm based license information.
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
  name: 'npm',

  /**
   * Parse the npm license information from the package.
   *
   * @param {Object} dep The package.json or npm package contents.
   * @param {Object} options Optional options.
   * @param {Function} next Continuation.
   * @api public
   */
  parse: function parse(dep, options, next) {
    var parser = this;

    if ('function' === typeof options) {
      next = options;
      options = {};
    }

    var matches = [];
    var data = dep.data;
    //
    // Another npm oddity, it allows licenses to be specified in to different
    // properties. Because why the fuck not?
    //
    ['license', 'licenses'].forEach(function each(key) {
      if ('string' === typeof data[key]) {
        return matches.push(data[key]);
      }

      if (Array.isArray(data[key])) {
        return Array.prototype.push.apply(
          matches,
          data[key].map(function map(item) {
            return parser.license(item);
          }).filter(Boolean)
        );
      }

      if ('object' === typeof data[key] && parser.license(data[key])) {
        return Array.prototype.push.apply(
          matches,
          [parser.license(data[key])]
        );
      }
    });

    //
    // We cannot detect a license so we call the callback without any arguments
    // which symbolises a failed attempt.
    //
    if (!matches.length) return next();

    debug('found %s in the package contents', matches);

    // @TODO handle the edge case where people give us an URL instead of an
    // actual license.
    next(undefined, parser.normalize(matches));

  },

  /**
   * Return the possible location of license information.
   *
   * @param {Object} data The object that should contain the license.
   * @returns {String}
   * @api private
   */
  license: function licenses(data) {
    if ('string' === typeof data && data) return data;
    if ('type' in data && data.type) return data.type;

    //
    // Common typo's
    //
    if ('type:' in data && data['type:']) return data['type:'];

    return;
  },

  /**
   * Is npm based license detection an option for this package.
   *
   * @param {Object} data The package.json or npm package contents.
   * @returns {Boolean}
   * @api public
   */
  supported: function supported(data) {
    return true;
  },

  /**
   * Retrieve the possible locations of the license information.
   *
   * @param {Object} data The package.json or npm package contents.
   * @returns {Array}
   * @api private
   */
  get: function get(data) {
    var parser = this
      , matches = [];



    if (matches.length) return matches;
  }
});
