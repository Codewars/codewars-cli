var shovel = require('../shovel'),
    util = require('../util'),
    temp = require('temp'),
    path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec;

function compile(args, cb) {
    args.unshift('clang', '-I `gnustep-config --variable=GNUSTEP_SYSTEM_HEADERS` -L `gnustep-config --variable=GNUSTEP_SYSTEM_LIBRARIES` -lgnustep-base -fconstant-string-class=NSConstantString -D_NATIVE_OBJC_EXCEPTIONS -fblocks -lobjc');
    args.push('-lBlocksRuntime');
    exec(args.join(' '), cb);
}

function getCode(opts)
{
    const code = [];

    if (opts.mode === "default")
    {
        code.push("#import <Foundation/Foundation.h>");
        code.push("int main (int argc, const char * argv[]) {");
        code.push(opts.solution);
        code.push("return 0;");
        code.push("}");
    }
    else
    {
        if (opts.setupHeader)
            code.push(opts.setupHeader);

        if (opts.codeHeader)
            code.push(opts.codeHeader);

        if (opts.setup)
            code.push(opts.setup);

        code.push(opts.solution);
        code.push(opts.fixture);
    }

    return code.join("\n");
}

module.exports.run = function run(opts, cb) {
    temp.track();
    var dir = temp.mkdirSync('objc');
    var args = [];

    shovel.start(opts, cb, {
        solutionOnly: function (runCode, fail) {
            var executable = path.join(dir, 'solution');

            opts.solution = getCode(opts);

            var solutionFile = util.codeWriteSync('objc', opts.solution, dir, 'solution.m');

            args = ['-o', executable, solutionFile];

            compile(args, function (error, stdout, stderr) {
                if (error) return fail(error, stdout, stderr);
                opts.publish('stdout', stdout);
                runCode({'name': executable, 'args': []});
            });
        },
        testIntegration: function (runCode, fail) {

            opts.solution = `
                #import <CW/CWTest.h>
                #import <Foundation/Foundation.h>
                #import <Foundation/NSAutoreleasePool.h>
                #import <Foundation/NSException.h>
                #import <Foundation/NSDebug.h>
                #import <Foundation/NSObject.h>
                #import <Foundation/NSString.h>
                #import <Foundation/NSObjCRuntime.h>
                #include <string.h>
                #if	defined(GNUSTEP)
                #import <GNUstepBase/GSObjCRuntime.h>
                #else
                #include <objc/runtime.h>
                #endif
                ${opts.setup || ''}
                ${opts.solution || ''}
                int main (int argc, const char * argv[]) {
                    @autoreleasepool {
                        ${opts.fixture}
                    }
                    return 0;
                }
            `;

            var executable = path.join(dir, 'solution');
            var solutionFile = util.codeWriteSync('objc', opts.solution, dir, 'solution.m');

            args = ['-o', executable, solutionFile];

            compile(args, function (error, stdout, stderr) {
                if (error) return fail(error, stdout, stderr);
                opts.publish('stdout', stdout + stderr);
                runCode({'name': executable, 'args': []});
            });
        },
        // objc NSLog is the stanard way of debugging, but everything goes to stderr. Fortunately normal
        // log messages also contain a timestamp prefix, so we can identify these messages and move them to stdout.
        // The one main issue here is that if anything is written to stdout, it won't be interleaved together.
        transformBuffer: function(buffer) {
            let stdout = buffer.stdout, stderr = buffer.stderr;
            buffer.stderr = '';
            stderr.split(/\n/gm).forEach(line => {
                let newLine = line.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w*\[\d*\]  ?/, '');
                if (line == newLine) {
                    buffer.stderr += line + "\n";
                }
                else {
                    buffer.stdout += newLine + "\n";
                }
            });

        }
    });
};