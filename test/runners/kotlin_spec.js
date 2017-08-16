"use strict";

const expect = require('chai').expect;
const runner = require('../runner');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const exec = require('child_process').exec;

describe('kotlin-runner', function() {
  before(function startDaemon(done) {
    this.timeout(0);
    exec('gradle --daemon --offline test', {
      cwd: '/runner/frameworks/gradle',
    }, (err) => {
      if (err) return done(err);
      console.log('Started Gradle daemon');
      done();
    });
  });

  describe('running', function() {
    afterEach(function cleanup(done) {
      exec('rm -rf /home/codewarrior/project', function(err) {
        if (err) return done(err);
        done();
      });
    });

    it('should handle basic code evaluation', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        solution: [
          `fun main(args: Array<String>) {`,
          `    println(42)`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.equal('42\n');
        done();
      });
    });

    it('should handle setup code', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        setup: [
          `fun greet(name: String): String {`,
          `    return "Hello, " + name`,
          `}`,
        ].join('\n'),
        solution: [
          `fun main(args: Array<String>) {`,
          `    println(greet("Joe"))`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.equal('Hello, Joe\n');
        done();
      });
    });

    it('can have package declaration', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        setup: [
          `package example`,
          `fun greet(name: String): String {`,
          `    return "Hello, " + name`,
          `}`,
        ].join('\n'),
        solution: [
          `package example`,
          `fun main(args: Array<String>) {`,
          `    println(greet("Joe"))`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.equal('Hello, Joe\n');
        done();
      });
    });
  });

  describe('testing with JUnit', function() {
    afterEach(function cleanup(done) {
      exec('rm -rf /home/codewarrior/project', function(err) {
        if (err) return done(err);
        done();
      });
    });

    it('should handle basic assertion', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'junit4',
        solution: [
          `fun add(a: Int, b: Int) = a + b`,
        ].join('\n'),
        fixture: [
          `import kotlin.test.assertEquals`,
          `import org.junit.Test`,
          ``,
          `class TestAdd {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(2, add(1, 1))`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('<PASSED::>');
        done();
      });
    });

    it('should handle basic assertion with named package', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'junit4',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int) = a + b`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import kotlin.test.assertEquals`,
          `import org.junit.Test`,
          ``,
          `class TestAdd {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(2, add(1, 1))`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('<PASSED::>');
        done();
      });
    });

    it('should handle basic assertion failure', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'junit4',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int) = a - b`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import kotlin.test.assertEquals`,
          `import org.junit.Test`,
          ``,
          `class TestAdd {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(2, add(1, 1))`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        console.log(buffer);
        expect(buffer.stdout).to.contain('<FAILED::>');
        done();
      });
    });

    it('should handle basic assertion failure by error', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'junit4',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int) = a / b`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import kotlin.test.assertEquals`,
          `import org.junit.Test`,
          ``,
          `class TestAdd {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(1, add(1, 0))`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        console.log(buffer);
        expect(buffer.stdout).to.contain('<ERROR::>');
        done();
      });
    });

    it('should handle basic assertion failure with message', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'junit4',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int) = a - b`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import kotlin.test.assertEquals`,
          `import org.junit.Test`,
          ``,
          `class TestAdd {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(2, add(1, 1), "add(1, 1) should return 2")`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        console.log(buffer);
        expect(buffer.stdout).to.contain('<FAILED::>');
        expect(buffer.stdout).to.contain('add(1, 1) should return 2');
        done();
      });
    });

    it('can have multiple suites', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'junit4',
        solution: [
          `package kata`,
          `fun add(a: Int, b: Int): Int {`,
          `  return a + b`,
          `}`,
        ].join('\n'),
        fixture: [
          `package kata`,
          `import kotlin.test.assertEquals`,
          `import org.junit.Test`,
          `class TestAddPositive {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(2, add(1, 1))`,
          `  }`,
          `}`,
          `class TestAddNegative {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(-2, add(-1, -1))`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        const expected = [
          '<DESCRIBE::>',
          '  <IT::><PASSED::><COMPLETEDIN::>',
          '<COMPLETEDIN::>',
          '<DESCRIBE::>',
          '  <IT::><PASSED::><COMPLETEDIN::>',
          '<COMPLETEDIN::>',
        ].join('').replace(/\s/g, '');
        expect(buffer.stdout.match(/<(?:DESCRIBE|IT|PASSED|FAILED|COMPLETEDIN)::>/g).join('')).to.equal(expected);
        done();
      });
    });

    it('should allow logging', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'junit4',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int): Int {`,
          '  println("a = ${a}, b = ${b}")',
          `  return a + b`,
          `}`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import kotlin.test.assertEquals`,
          `import org.junit.Test`,
          ``,
          `class TestAdd {`,
          `  @Test`,
          `  fun addTest() {`,
          `    assertEquals(2, add(1, 1))`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('a = 1, b = 1');
        expect(buffer.stdout).to.contain('<PASSED::>');
        done();
      });
    });
  });

  describe('testing with KotlinTest', function() {
    afterEach(function cleanup(done) {
      exec('rm -rf /home/codewarrior/project', function(err) {
        if (err) return done(err);
        done();
      });
    });

    it('should handle basic assertion', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'kotlintest',
        solution: [
          `fun add(a: Int, b: Int) = a + b`,
        ].join('\n'),
        fixture: [
          `import io.kotlintest.matchers.shouldBe`,
          `import io.kotlintest.specs.StringSpec`,
          ``,
          `class TestAdd : StringSpec() {`,
          `  init {`,
          `    "add(1, 1) should return 2" {`,
          `      add(1, 1) shouldBe 2`,
          `    }`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('<PASSED::>');
        done();
      });
    });

    it('should handle basic assertion with named package', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'kotlintest',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int) = a + b`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import io.kotlintest.matchers.shouldBe`,
          `import io.kotlintest.specs.StringSpec`,
          ``,
          `class TestAdd : StringSpec() {`,
          `  init {`,
          `    "add(1, 1) should return 2" {`,
          `      add(1, 1) shouldBe 2`,
          `    }`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('<PASSED::>');
        done();
      });
    });

    it('should handle basic assertion failure', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'kotlintest',
        solution: [
          `fun add(a: Int, b: Int) = a - b`,
        ].join('\n'),
        fixture: [
          `import io.kotlintest.matchers.shouldBe`,
          `import io.kotlintest.specs.StringSpec`,
          ``,
          `class TestAdd : StringSpec() {`,
          `  init {`,
          `    "add(1, 1) should return 2" {`,
          `      add(1, 1) shouldBe 2`,
          `    }`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('<FAILED::>');
        done();
      });
    });

    it('should handle basic assertion failure by error', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'kotlintest',
        solution: [
          `fun add(a: Int, b: Int) = a / b`,
        ].join('\n'),
        fixture: [
          `import io.kotlintest.matchers.shouldBe`,
          `import io.kotlintest.specs.StringSpec`,
          ``,
          `class TestAdd : StringSpec() {`,
          `  init {`,
          `    "add(1, 0) should return 1" {`,
          `      add(1, 0) shouldBe 1`,
          `    }`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('<ERROR::>');
        done();
      });
    });


    it('can have multiple suites', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'kotlintest',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int) = a + b`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import io.kotlintest.matchers.shouldBe`,
          `import io.kotlintest.specs.StringSpec`,
          ``,
          `class TestAddPositives : StringSpec() {`,
          `  init {`,
          `    "add(1, 1) should return 2" {`,
          `      add(1, 1) shouldBe 2`,
          `    }`,
          `  }`,
          `}`,
          ``,
          `class TestAddNegatives : StringSpec() {`,
          `  init {`,
          `    "add(-1, -1) should return -2" {`,
          `      add(-1, -1) shouldBe -2`,
          `    }`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        const expected = [
          '<DESCRIBE::>',
          '  <IT::><PASSED::><COMPLETEDIN::>',
          '<COMPLETEDIN::>',
          '<DESCRIBE::>',
          '  <IT::><PASSED::><COMPLETEDIN::>',
          '<COMPLETEDIN::>',
        ].join('').replace(/\s/g, '');
        expect(buffer.stdout.match(/<(?:DESCRIBE|IT|PASSED|FAILED|COMPLETEDIN)::>/g).join('')).to.equal(expected);
        done();
      });
    });

    it('should allow logging', function(done) {
      this.timeout(0);
      runner.run({
        language: 'kotlin',
        testFramework: 'kotlintest',
        solution: [
          `package kata`,
          ``,
          `fun add(a: Int, b: Int): Int {`,
          '  println("a = ${a}, b = ${b}")',
          `  return a + b`,
          `}`,
        ].join('\n'),
        fixture: [
          `package kata`,
          ``,
          `import io.kotlintest.matchers.shouldBe`,
          `import io.kotlintest.specs.StringSpec`,
          ``,
          `class TestAdd : StringSpec() {`,
          `  init {`,
          `    "add(1, 1) should return 2" {`,
          `      add(1, 1) shouldBe 2`,
          `    }`,
          `  }`,
          `}`,
        ].join('\n'),
      }, function(buffer) {
        expect(buffer.stdout).to.contain('a = 1, b = 1');
        expect(buffer.stdout).to.contain('<PASSED::>');
        done();
      });
    });
  });

  describe('Example Challenges', function() {
    afterEach(function cleanup(done) {
      exec('rm -rf /home/codewarrior/project', function(err) {
        if (err) return done(err);
        done();
      });
    });

    forEachExamples(function(framework, name, example) {
      describe(`${framework}: "${name}" example`, function() {
        it('should define an initial code block', function() {
          expect(example.initial).to.be.a('string');
        });

        it('should have a passing solution', function(done) {
          this.timeout(0);
          runner.run({
            language: 'kotlin',
            setup: example.setup,
            solution: example.answer,
            fixture: example.fixture,
            testFramework: framework,
          }, function(buffer) {
            expect(buffer.stdout).to.contain('<PASSED::>');
            expect(buffer.stdout).to.not.contain('<FAILED::>');
            expect(buffer.stdout).to.not.contain('<ERROR::>');
            done();
          });
        });
      });
    });
  });
});


function forEachExamples(cb) {
  const examples = yaml.safeLoad(fs.readFileSync(path.join(__dirname, `../../examples/kotlin.yml`), 'utf8'));
  for (const framework of Object.keys(examples)) {
    for (const example of Object.keys(examples[framework])) {
      cb(framework, example, examples[framework][example]);
    }
  }
}
