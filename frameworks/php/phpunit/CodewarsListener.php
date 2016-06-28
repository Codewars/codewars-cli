<?php
    use PHPUnit\Framework\TestCase;

    class CodewarsListener implements PHPUnit_Framework_TestListener
    {
        public function addError(PHPUnit_Framework_Test $test, Exception $e, $time)
        {
            $message = preg_replace('/\n/', '<:LF:>', $e->getMessage());
            printf("<FAILED::>%s\n", $message);
        }

        public function addFailure(PHPUnit_Framework_Test $test, PHPUnit_Framework_AssertionFailedError $e, $time)
        {
            $message = preg_replace('/\n/', '<:LF:>', $e->getMessage());
            printf("<FAILED::>%s\n", $message);
        }

        public function addIncompleteTest(PHPUnit_Framework_Test $test, Exception $e, $time)
        {
            // see https://phpunit.de/manual/current/en/incomplete-and-skipped-tests.html
        }

        public function addRiskyTest(PHPUnit_Framework_Test $test, Exception $e, $time)
        {
            // see https://phpunit.de/manual/current/en/risky-tests.html
        }

        public function addSkippedTest(PHPUnit_Framework_Test $test, Exception $e, $time)
        {
            // see https://phpunit.de/manual/current/en/incomplete-and-skipped-tests.html
        }

        public function startTest(PHPUnit_Framework_Test $test)
        {
            printf("<IT::>%s\n", $test->getName());
        }

        public function endTest(PHPUnit_Framework_Test $test, $time)
        {
            printf("<PASSED::>%s\n", $test->getName());
            printf("<COMPLETEDIN::>%s\n", number_format($time * 1000, 2, '.', ''));
        }

        public function startTestSuite(PHPUnit_Framework_TestSuite $suite)
        {
            printf("<DESCRIBE::>%s\n", $suite->getName());
        }

        public function endTestSuite(PHPUnit_Framework_TestSuite $suite)
        {
            printf("\n<COMPLETEDIN::>\n");
        }
    }
?>