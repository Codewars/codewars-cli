var shovel = require('../shovel'),
    util = require('../util'),
    temp = require('temp');

module.exports.run = function run(opts, cb) {
    var dir = temp.mkdirSync('typescript');
    shovel.start(opts, cb, {
        solutionOnly: function (run) {
            // TODO: Support Setup Code

            var solutionFile = util.codeWriteSync('typescript', opts.solution, dir, 'solution.ts', true);
            util.exec('tsc ' + solutionFile + ' --module commonjs', function () {
                run({name: 'node', args: [solutionFile.replace('.ts', '.js')]});
            });
        },
        testIntegration: function (run) {
            switch (opts.testFramework) {
                case 'mocha':
                case 'mocha_bdd':
                    return prepareMocha(opts, 'bdd', run);
                case 'mocha_tdd':
                    return prepareMocha(opts, 'tdd', run);
                default:
                    throw 'Test framework is not supported'
            }
        },
        sanitizeStdErr: function(error)
        {
            error = error || ''
            return error.replace(/(\()?\/codewars\/[(\w\/-\d.js:) ;]*/g, '')
                .replace(/( Object. )?[\(]?\[eval\][-:\w\d\)]* at/g, '')
                .replace(/Module._compile.*/g, '')
                .replace('Object.Test.handleError ', '')
                .replace('  ', ' ');
        },
        sanitizeStdOut: function(stdout)
        {
            return this.sanitizeStdErr(stdout);
        }
    });

    function prepareMocha(opts, interfaceType, run) {
        var code = opts.setup ? `${opts.setup}\n${opts.solution}` : opts.solution;

        var codeFile = util.codeWriteSync('typescript', code, null, 'solution.ts', true);

        util.exec('tsc --module commonjs ' + codeFile, function () {
            var specFile = util.codeWriteSync('typescript', opts.fixture, null, 'spec.ts', true);

            util.exec('tsc --module commonjs ' + specFile, function () {
                specFile = specFile.replace('.ts', '.js')
                run({name: 'mocha', 'args': ['-t', opts.timeout || 7000, '-u', interfaceType, '-R', 'mocha-reporter', specFile]});
            });
        });
    }

};