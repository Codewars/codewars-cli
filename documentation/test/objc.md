#### Objective C - Unit Testing API

Running simply equal test:


```
describe(@"String not match", ^() {
    it(@"should not match", ^() {
        equal(@"Blah", @"Blah1");
    });
});
```

Output:
>\<DESCRIBE::> String not match
 \<IT::> It should not match
 \<FAILED::>Expected "Blah" but instead got "Blah1"
 \<COMPLETEDIN::>0
 \<COMPLETEDIN::>0

```
describe(@"String is not equal", ^() {
    it(@"should pass", ^() {
        notEqual(@"Blah", @"Blah1");
    });
});
```

Output:
>\<DESCRIBE::> String not match
 \<IT::> It should pass
 \<PASSED::>Test Passed
 \<COMPLETEDIN::>0
 \<COMPLETEDIN::>0

Comparing numbers

```
describe(@"Compare types of numbers", ^() {
    it(@"should match int", ^() {
        equal(@1, @1);
    });
    
    it(@"should not match int", ^() {
        equal(@1, @2);
    });
    
    it(@"should match float", ^() {
        equal(@2.20, @2.2);
    });
});
```

Output:
>\<DESCRIBE::> Compare types of numbers
 \<IT::> It should match int
 \<PASSED::>Test Passed
 \<COMPLETEDIN::>0
 \<IT::> It should not match int
 \<FAILED::>Expected "1" but instead got "2"
 \<COMPLETEDIN::>0
 \<IT::> It should match float
 \<PASSED::>Test Passed
 \<COMPLETEDIN::>0
 \<COMPLETEDIN::>4
\
Simple pass check:

```
describe(@"True always equal true", ^() {
    it(@"should pass", ^() {
        pass(true == true);
    });
});
```

>\<DESCRIBE::> True always equal true
 \<IT::> It should pass
 \<PASSED::>Test Passed
 \<COMPLETEDIN::>0
 \<COMPLETEDIN::>0