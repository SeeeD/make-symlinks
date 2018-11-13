'use strict';
var fs = require('fs');
var path = require('path');
var del = require('del');
var pify = require('pify');
var globby = require('globby');
var pinkiePromise = require('pinkie-promise');

var Promise = global.Promise || pinkiePromise;
var fsP = {
	symlink: pify(fs.symlink, Promise)
};

function abortIfFileExists(fp) {
	if (fs.existsSync(fp)) {
		throw new Error(fp + ' has already exists. Can be with `force` options');
	}
}

module.exports = function (patterns, destPath, destFilename, sourceFilename) {
	var opts = {};
	opts.force = opts.force || true;
	opts.dryRun = opts.dryRun || false;

	destPath = path.resolve('', destPath);
	patterns = path.join(patterns, sourceFilename);

	if (!fs.existsSync(destPath)) {
		throw new Error('Path ' + destPath + ' doesn\'t exists');
	}

	var strategy = {
		del: {force: opts.force}
	};

	delete opts.force;

	var dryRun = opts.dryRun;
	delete opts.dryRun;

	return globby(patterns, opts).then(function (paths) {
		return Promise.all(paths.map(function (targetPath) {
			var target = path.resolve(opts.cwd || '', targetPath);
			var dest = path.join(destPath, path.basename(targetPath));
			if (!!destFilename) {
				dest = path.join(destPath, destFilename);
			}

			if (!strategy.del.force) {
				abortIfFileExists(dest);
			}

			if (dryRun) {
				return Promise.resolve({target: target, path: dest});
			}

			return Promise.resolve()
				.then(function () {
					return Promise.resolve(fs.existsSync(dest) ? del(dest, strategy.del) : null);
				})
				.then(function () {
					return fsP.symlink(target, dest);
				})
				.then(function () {
					return {target: target, path: dest};
				});
		}));
	});
};

module.exports.sync = function (patterns, destPath, destFilename, sourceFilename) {
	var opts = {};
	opts.force = opts.force || true;
	opts.dryRun = opts.dryRun || false;

	destPath = path.resolve('', destPath);
	patterns = path.join(patterns, sourceFilename);

	if (!fs.existsSync(destPath)) {
		throw new Error('Path ' + destPath + ' doesn\'t exist');
	}

	var strategy = {
		del: {force: opts.force}
	};
	delete opts.force;

	var dryRun = opts.dryRun;
	delete opts.dryRun;

	return globby.sync(patterns, opts).map(function (targetPath) {
		var target = path.resolve(opts.cwd || '', targetPath);
		var dest = path.join(destPath, path.basename(targetPath));
		if (!!destFilename) {
			dest = path.join(destPath, destFilename);
		}

		if (!strategy.del.force) {
			abortIfFileExists(dest);
		}

		if (!dryRun) {
			if (fs.existsSync(dest)) {
				del.sync(dest, strategy.del);
			}

			fs.symlinkSync(target, dest);
		}

		return {target: target, path: dest};
	});
};
