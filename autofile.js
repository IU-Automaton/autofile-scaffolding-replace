'use strict';

var fs    = require('fs');
var glob  = require('glob');
var async = require('async');

module.exports = function (task) {
    task
    .id('scaffolding-replace')
    .name('Scaffolding: replace')
    .description('Replace {{placeholders}} in files with data. This will look for the placeholder in a file, and replace it with a string.')
    .author('Indigo United')

    .option('files', 'Which files to process. Accepts a filename and array of filenames. Also note that the filenames can be minimatch patterns.')
    .option('data', 'The data to replace with. Keys are placeholders and values the content for each placeholder.')
    .option('type', 'The type of data. Accepts "string" and "file"', 'string')
    .option('glob', 'The options to pass to glob (check https://npmjs.org/package/glob for details).', null)

    .do(function (opt, ctx, next) {
        opt.glob = opt.glob || {};
        var files = Array.isArray(opt.files) ? opt.files : [opt.files];
        var data = {};
        var keys = Object.keys(opt.data);

        opt.glob.mark = true;

        async.forEach(keys, function (key, next) {
            if (opt.type === 'file') {
                fs.readFile(opt.data[key], function (err, contents) {
                    if (err) {
                        return next(err);
                    }

                    data[key] = contents;
                    next();
                });
            } else {
                data[key] = opt.data[key];
                next();
            }
        }, function () {
            // data is done at this time
            // For each item in the files array, perform a glob
            async.forEach(files, function (file, next) {
                glob(file, opt.glob, function (err, matches) {
                    if (err) {
                        return next(err);
                    }

                    var files = matches.filter(function (match) {
                        return !/[\/\\]$/.test(match);
                    });

                    // For each file in the glob result,
                    // perform the interpolation
                    async.forEach(files, function (file, next) {
                        ctx.log.debugln('Reading file: ' + file);
                        fs.readFile(file, function (err, contents) {
                            if (err) {
                                return next(err);
                            }

                            contents = ctx.string.interpolate(contents.toString(), data);
                            ctx.log.debugln('Writing file: ' + file);
                            fs.writeFile(file, contents, next);
                        });
                    }, next);
                });
            }, next);
        });
    });
};
