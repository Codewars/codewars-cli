var util = require('util'),
    spawn = require('child_process').spawn,
    config = require('./config'),
    os = require('os'),
    escapeHtml = require('escape-html'),
    codeWriteSync = require('./util').codeWriteSync,
    temp = require('temp'),
    services = require('./services'),
    Promise = require('bluebird'),
    inspect = require('util').inspect;

// used for indicating an error which is related to user code and not an application error.
// useful for when we run code compilation inside of this host process.
var CompileError = module.exports.CompileError = function(message) {
    this.name = "CompileError";
    this.message = message;
}
CompileError.prototype = Error.prototype;


//runs the strategy specified in opts and reports the results of the run, then runs the callback
module.exports.start = function start(opts, cb, strategies)
{
    opts.publish = function(){}

    if (opts.ably && opts.channel) {
        try {
            var ably = new require('ably').Rest(opts.ably);
            var channel = ably.channels.get(opts.channel);
            opts.publish = function(event, data) {
                if (event && data) {
                    channel.publish(event, data);
                }
            }
        } catch(e)
        {}
    }

    // in case anything needs to cleanup after itself
    opts.onCompleted = [];

    cb = cb || function (){};
    run(opts, strategies, function (buffer)
    {
        reportBuffer(opts, buffer, strategies);
        cb(buffer);

        opts.onCompleted.forEach(f => f(buffer));
    });
};

// given the options provided and a list of strategies on how to handle them, run will pick the
// appropriate strategy and execute it.
function run(opts, strategies, cb)
{
    opts.dir = opts.dir || '/home/codewarrior'; // aka /workspace

    // this is the "run/exec" method that is passed in to the shovel methods as the callback.
    function runCode(params)
    {
        exec(opts, params.name, params.args, params.options, params.stdin, cb);
    }

    // called if the compile process fails
    function fail(error, stdout, stderr) {
        // if params is an object with stdout/err values, then assume its already been processed within the language specific runner
        if (error.stdout || error.stderr) {
            error.compilationFailure = true;
            cb(error);
        }
        // if an error is passed in, then this is an execution error probably happening due to a compilation issue
        else
        {
            var err = error.toString();
            // don't add stderr if its just a repeat of the error message
            if (stderr && err.indexOf(stderr) == -1) err += stderr;

            cb({
                stdout: stdout || '',
                stderr: err,
                wallTime: 0,
                exitCode: error.code,
                exitSignal: error.signal,
                compilationFailure: true
            });
        }
    }

    // write the solution to a text file so that it can be inspected if need be
    codeWriteSync(null, opts.code || opts.solution, opts.dir, 'solution.txt', true);

    var hasServices = opts.services && !!opts.services.length
    if (hasServices) opts.publish('status', 'Starting services...');

    // allow for language level modification of opts, such as services and shell
    if (strategies.modifyOpts) {
        strategies.modifyOpts(opts);
    }

    services.start(opts, function() {
        downloadFromGithub(opts, function() {
            setupFiles(opts, strategies);
            runShell(opts, function () {
                try {
                    if (strategies.before) strategies.before();
                    var strategy = opts.fixture ? strategies.testIntegration : strategies.solutionOnly;
                    strategy(runCode, fail);
                }
                catch (ex) {
                    fail(ex);
                }
            });
        });
    });
}

// if files are included, by default it will just write them to the working directory. If
// a files strategy is defined however, it will call that method instead.
function setupFiles(opts, strategies) {
    if (opts.files) {
        if (strategies.files) {
            strategies.files();
        }
        else {
            // write any optional files to the same directory
            util.writeFilesSync(opts.dir, opts.files, false);
        }
    }
}

// handles running an optional shell value, which allows users to configure a shell script to be ran
// before the code executes
function runShell(opts, resolve, status) {
    // if a shell is not specified through the API, it may be configured through the setup. In this case
    // it is assumed that a file exists which can be executed
    if (opts.setup) {
        var match = opts.setup.match(/^[ #|\/]* ?@run-shell-script (.*$)/m);
        if (match) opts.shell = `cd ${opts.dir} ; sh ${match[1]}`;
    }

    // if a shell script is provided then run it now
    if (opts.shell) {
        opts.publish('status', status || 'Running setup scripts...');
        temp.track();
        var file = codeWriteSync('bash', `#!/bin/bash\n${opts.shell}`, temp.mkdirSync('bash'), 'shell.sh'),
            shellOpts = {
                timeout: 10000, // allow the shell script its own 10 sec timeout
                compiling: true // set to true so that the script doesn't exit
            };

        exec(shellOpts, 'bash', [file], {}, null, function(result) {
            opts.shell = result;
            resolve();
        });
    }
    else {
        resolve();
    }
}

function downloadFromGithub(opts, resolve) {
    // if a githubRepo is not specified through the API, it may be configured through the setup
    if (opts.setup) {
        var match = opts.setup.match(/^[ #|\/]* ?@download-github-repo (.*$)/m);
        if (match) opts.githubRepo = match[1];
    }

    if (opts.githubRepo) {
        var repo = opts.githubRepo;
        if (repo.indexOf('/tarball') == -1) {
            repo += "/tarball"
        }
        if (repo.indexOf('api.github.com') == -1) {
            repo = 'https://api.github.com/repos/' + repo;
        }

        var dl = {
            publish: opts.publish,
            shell: `
                cd ${opts.dir}
                wget -qO- ${repo} | tar xvz --strip-components=1 
            `
        }

        runShell(dl, resolve, 'Downloading files from Github...');
    }
    else {
        resolve();
    }
}

function exec(opts, name, args, processOptions, processStdin, cb)
{
    opts.publish = opts.publish || function(){};

    opts.publish("status", "Running...");

    var args = args || [],
	      child = spawn(name, args, processOptions),
        buffer = {stdout: '', stderr: ''},
        start = new Date(),
        finished = false,
        stdoutLength = 0,
        maxTime = opts.timeout || config.timeouts[opts.language] || config.timeouts.default

    function exit(reason)
    {
        if (!finished)
        {
            child.kill('SIGKILL');
            buffer.exitSignal = 'SIGKILL';
            if (reason) buffer.stderr += reason + '\n';
            finished = true;
        }
        cb(buffer);
    }

    function cleanupFiles()
    {
        // cleanup temp files
        if (opts.tempFiles)
        {
            for (var i = 0, l = opts.tempFiles.length; i < l; i++)
            {
                fs.unlink(opts.tempFiles[i]);
            }
            delete opts.tempFiles;
        }
    }

    if (processStdin) child.stdin.write(processStdin);

    // Listen
    const KB = 1024;
    const MAX_BUFFER = KB * 1500; // 1.5mb
    const MAX_DATA_BUFFER = KB * 50; //50kb is the max that can be written at once.
    child.stdout.on('data', function (data)
    {
        if (!!data)
        {
            var text = data.toString();
            opts.publish('stdout', `${text.length}: ${text}\n`);
            stdoutLength += text.length;
            if (text.length > MAX_DATA_BUFFER) {
                text = text.substr(0, MAX_DATA_BUFFER);
                text += `\nContent truncated due to max data buffer of ${MAX_DATA_BUFFER / KB}kb being reached. Try flushing buffer with less content.\n`;
            }
            buffer.stdout += text;
        }

        if (stdoutLength > MAX_BUFFER)
        {
            var msg = 'Max Buffer reached: Too much information has been written to stdout.'
            opts.publish(msg);
            buffer.status = 'max_buffer_reached';
            exit(msg);
        }
    });

    child.stderr.on('data', function (data)
    {
        if (!!data) {
            var text = data.toString();
            opts.publish('stderr', text);
            buffer.stderr += text;
        }
    });

    child.on('close', code => buffer.code = code);
    child.on('error', exit);

    // prevent the process from running for too long
    var timeout = setTimeout(function ()
    {
        if (!finished)
        {
            buffer.status = 'max_time_reached';
            exit('Process was terminated. It took longer than ' + maxTime + 'ms to complete');
        }
        process.exit(1);
    }, maxTime);

    var complete = function(code, signal) {
        if(finished) return;

        finished = true;
        buffer.exitCode = code;
        buffer.exitSignal = signal;
        buffer.wallTime = new Date() - start;
        cleanupFiles();
        cb(buffer);

        // if we are within the run script
        if (!opts.compiling && (process.argv[1] || '').indexOf('/run') >= 0)
        {
            //ensure that node exits now, even if processes have forked off
            process.exit(0);
        }
    }

    child.on('exit', function (code, signal) {
        // wait the remaining time left to see if all stdio processes close
        // preferably we cleanup after 'exit' is called
        setTimeout(function() {
            complete(code, signal);
        }, getTimeLeft(timeout))
    });

    child.on('close', function (code, signal) {
        clearTimeout(timeout);
        complete(code, signal);
    });

    child.stdin.end();
}

// Get the time left in a set timeout
// http://stackoverflow.com/questions/3144711/find-the-time-left-in-a-settimeout
function getTimeLeft(timeout) {
    return Math.ceil((timeout._idleStart + timeout._idleTimeout - Date.now()) / 1000);
}

function reportBuffer(opts, buffer, strategies)
{
    if (strategies)
    {
        // added as a way to transform the buffer before any additional stdout/err specific processing is made.
        // useful for things like when you may want to split stdout into both stdout and stderr
        if (strategies.transformBuffer) {
            strategies.transformBuffer(buffer);
        }

        // if there is an error, provide the ability to sanitize it. This is useful for when
        // output can be noisy.
        if (buffer.stderr && strategies.sanitizeStdErr)
        {
            buffer.stderr = strategies.sanitizeStdErr(buffer.stderr);
        }

        if (buffer.stdout && strategies.sanitizeStdOut)
        {
            buffer.stdout = strategies.sanitizeStdOut(buffer.stdout);
        }
    }

    // return the output of the shell call
    if (opts.shell) {
        buffer.shell = opts.shell;
    }

    // escape the stderr output after strategies have been run
    // and before the it is written to the process stream

    buffer.outputType = strategies.outputType || 'pre';

    if (opts.format == 'json')
    {
        var json = JSON.stringify(buffer);
        writeToStream(process.stdout, json, "\\n");
    }
    else
    {
        if (buffer.stdout) writeToStream(process.stdout, buffer.stdout, "\n")
        if (buffer.stderr) writeToStream(process.stderr, buffer.stderr, "\n")
        if (buffer.wallTime && opts.debug) {
            console.info(buffer.wallTime + 'ms');
        }
    }
}

// we need to chunk the data back out to handle strange inconsistency issues with large data.
// Ideally we could chunk based off of character count but for some reason chunking by line breaks
// is the only thing that is consistent.
function writeToStream(stream, data, linebreak) {
    data.split(linebreak).forEach((line, i, arr) => {
        // don't write a line break on the last line
        return stream.write(line.normalize() + (i != arr.length - 1 ? linebreak : ''))
    });
}