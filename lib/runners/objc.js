var shovel = require('../shovel'),
    util = require('../util'),
    path = require('path'),
    temp = require('temp');

module.exports.run = function run(opts, cb) {
    // Sandbox expects files to have this directory as an ancestor
    var objcDir = '/tmp/objc';
    util.mkdirParentSync(objcDir);
    temp.track();
    var dir = temp.mkdirSync({dir: objcDir}),
	      objcSandbox = path.resolve('frameworks', 'osx', 'objc.sb');

    shovel.start(opts, cb, {
        solutionOnly: function (runCode, fail) {
            var solutionFile = util.codeWriteSync('objc', opts.code, dir, 'main.m'),
                command = 'clang -lobjc -framework Foundation -o main ' + solutionFile;

            if ("setup" in opts) {
                util.codeWriteSync('objcHeader', opts.setupHeader, dir, 'setup.h');
                command = command + ' ' + util.codeWriteSync('objc', opts.setup, dir, 'setup.m');
            }

            util.exec(command, {'cwd': dir}, function (error) {
                if (error) return fail(error);
                runCode({
                    'name': 'sandbox-exec',
                    'args': ['-f', objcSandbox, './main'],
                    'options': {'cwd': dir}
                });
            });
        },
        testIntegration: function (runCode, fail) {
            require('./xcode').testIntegration(opts, runCode);
        }
    });
};
