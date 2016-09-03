module.exports = {
    version: '1.0.5',
    testFramework: {
        defaults: {
            javascript: 'cw-2',
            coffeescript: 'cw-2',
            ruby: 'cw-2',
            python: 'cw-2'
        }
    },
    timeouts: {
        default: 8000,
        clojure: 11000,
        java: 11000,
        groovy: 11000,
        scala: 11000,
        kotlin: 11000
    },
    moduleRegExs: {
        haskell: /module\s+([A-Z]([a-z|A-Z|0-9]|\.[A-Z])*)\W/,
        julia: /module\s+([a-z|A-Z][a-z|A-Z|0-9]*)\W/,
        erlang: /-module\(([a-z|A-Z][a-z|A-Z|0-9|_]*)\)/,
        elixir: /defmodule\s+([a-z|A-Z][.a-z|A-Z|0-9|_]*)\s+do/,
        scala: /(?:object|class)\s+([A-Z][a-z|A-Z|0-9|_]*)/,
        kotlin: /(?:object|class)\s+([A-Z][a-z|A-Z|0-9|_]*)/,
        swift: /\n*\/\/\s*([a-z|A-Z|0-9|_|-]+)\.swift\s*\n/,
        objc: /\n*\/\/\s*([a-z|A-Z|0-9|_|-]+)\.m\s*\n/,
        objcHeader: /\n*\/\/\s*([a-z|A-Z|0-9|_|-]+)\.h\s*\n/
    },
    fileExtensions: {
        haskell: 'hs',
        julia: 'jl',
        erlang: 'erl',
        elixir: 'ex',
        scala: 'scala',
	      swift: 'swift',
	      objc: 'm',
	      objcHeader: 'h',
        kotlin: 'kt',
        crystal: 'cr'
    },
    snippets: {
        python: {
            addPythonFramework: [
                "try: from imp import reload",
                "except: pass",
                "reload(__import__('sys')).path.append('./frameworks/python')"
            ].join('\n'),
            // TODO: handle different test class names
            requireCw2: "test = Test = reload(__import__('cw-2'))",
            requireUnittest: "unittest = reload(__import__('unittest'))",
            // bit of a hack, hard-coding the DESCRIBE/COMPLETEDIN here
            // however, Python doesn't seem to want to call start/endTestRun, so this will have to do for now
            runUnittest: `
print("<DESCRIBE::>Tests")
unittest.TestLoader().loadTestsFromTestCase(Test).run(reload(__import__('unittestwrapper')).CwTestResult())
print("<COMPLETEDIN:>")
`
        }
    }
};

module.exports.snippets.python3 = module.exports.snippets.python;
