# playwright-trx-reporter

## How to use
1. set your config
``` ts
const config: PlaywrightTestConfig = {
  ...
  reporter: [
    ['playwright-trx-reporter', { 
      outputFile: "./reporter/output.trx",
      }]
  ],
  ...
}
```
2. create a helper could make things easy and get type check
``` ts
    // create a helper to make it easy
    import { test } from '@playwright/test';
    class TrxHelper{
      static pushAnnotation(type:string,value:string){
        test.info().annotations.push({
          type:type,
          description:value,
        });
      }

      static owner(owner:string){
        this.pushAnnotation('owner', owner);
      }

      static priority(priority:number){
        this.pushAnnotation('priority', priority.toString());
      }
    }

    test('one', async ({}, testInfo) => {
        TrxHelper.owner('Someone');
    });
```
3. create a auto fixture so that you do not need to set owner for each case.
``` ts
    // A auto fixtures:
    const { test as base } = trxReporter;

    const test = base.extend<{ someoneOwner:void }>({
      someoneOwner:[async ()=>{
        TrxHelper.owner('Someone');
      }
      , { auto:true }],
    });

    test('one', async ({}, testInfo) => {
        // Not need to do anything
        // If you want to change the owner, just 
        // trx.owner('someone else')
    });
```

## Single TRX VS Multi TRX
Azure test supports "Rerun failed tests" and "Data driven tests". Reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/test/review-continuous-test-results-after-build?view=azure-devops#view-summarized-test-results

"Data driven tests" is common and powerful, but it's kind of different when it comes to JS. JS is highly dynamic, which allows you to create test cases dynamically. In comparation, C# and Java need you give a centain test name(the method name with specific attribute/annotation). So this feature is encouraged to skip.

"Rerun failed tests" is Charming. However, it's not trivial. To get this feature, we need to generate multi trx file and publish them together. And the test model might not be matched pretty well.

## TRX
A list of many test data format: https://help.testspace.com/reference/data-formats/

A detailed description of differnt test file format(however, no trx): https://docs.getxray.app/display/XRAYCLOUD/Integrating+with+Testing+Frameworks

Playwright report docs: https://playwright.dev/docs/test-reporters

Playwright report impls: https://github.com/microsoft/playwright/blob/main/packages/playwright-test/src/reporters/base.ts

Many trx file example: https://github.com/picklesdoc/pickles/

## XSD
W3Schools reference: https://www.w3schools.com/xml/schema_elements_ref.asp

The spec is hard to read, you would better to take a look at "W3Schools reference" firstly

## Tools
Tools to convert xsd to ts

https://github.com/pocketbitcoin/xsd-tools

https://github.com/charto/cxsd

https://github.com/spreeuwers/xsd2ts

## Limitation

### Seems like forever
1. TRX is pretty complex. The xsd file has 2000+ lines, in comparsion, the [xsd file of JUnit](https://github.com/windyroad/JUnit-Schema/blob/master/JUnit.xsd) only has 200 lines including many comments. And there is almost no comments in the xsd file. So it's kind of hard to know the intension clearly for some situations.

2. Also, there is no open spec for it, this "vstst.xsd" is from VS2022, it might change in the future.

### For now

1. Some property is not filled by default, like platform, and could not be set by now. If you think they are useful, please let me know!

2. repeat tests. For now each run of test(including retry) will be added as one test individually.

3. Azure DevOps supports to add Attachment, but we have 9 different ways to do that! I have no idea what the difference really is for some of them. And even they are same, I might only use some of them to simplify. For now, I only attach file that exist.
