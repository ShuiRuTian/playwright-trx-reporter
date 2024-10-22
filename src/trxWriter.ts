/* eslint-disable @typescript-eslint/no-use-before-define */
import type {
  Suite, TestCase, TestResult, TestStatus,
} from '@playwright/test/reporter';
import fs from 'fs';
import {
  RESULT_NOT_IN_A_LIST_ID, TestRunBuilder, TestRunBuilderOptions, NAME_SPLITTER,
} from './TestRunBuilder';
import {
  OutputType, TestOutcome, UnitTestResultType, UNIT_TEST_TYPE,
  TestRunType,
} from './trxModel';
import { assertNever } from './assert';

import { computerName, convertPwId2Uuid, createUuid } from './utils';

interface TrxsBuilder {
  /**
   * Analytics the root suite of playwright. And generate trx models.
   *
   * @param rootSuite The root suite of playwright
   * @returns the generated trx models
   */
  analytics(rootSuite: Suite, options: TrxWriterOptions): TestRunType[];
}

export interface TrxWriterOptions {
  /**
   * The type of `annotation`, whose value will be the trx model's 'owner'
   */
  ownerAnnotation: string,

  /**
   * The type of `annotation`, whose value will be the trx model's 'priority'
   */
  priorityAnnotation: string,

  /**
   * How to treat playwright test retries. By default they are listed as individual tests any of which could fail.
   */
  groupRetriesAsSingleTest: boolean,

  /**
   * The constructor options of `TestRunBuilder`
   */
  testRunBuilderOptions: TestRunBuilderOptions,
}

interface TestRunsBuilder {
  /**
   * Get an existing `TestRunBuilder` or create a new one.
   *
   * We assume that testResultIndex is the same as current retry time.
   */
  getOrCreateTestRunBuilder(testResultIndex: number): TestRunBuilder;
  build(): TestRunType[];
}

function mergeAllSuitesToTestRunBuilder(testRunsBuilder: TestRunsBuilder, suite: Suite, options: TrxWriterOptions) {
  for (const projectSuite of suite.suites) {
    for (const fileSuite of projectSuite.suites) {
      mergeFileOrGroupSuite(testRunsBuilder, fileSuite, options);
    }
  }
}

function mergeFileOrGroupSuite(testRunsBuilder: TestRunsBuilder, suite: Suite, options: TrxWriterOptions) {
  if (suite.allTests().length === 0) { return; }

  suite.tests.forEach((test) => {
    mergeTestCase(testRunsBuilder, test, options);
  });

  suite.suites.forEach((subSuite) => {
    mergeFileOrGroupSuite(testRunsBuilder, subSuite, options);
  });
}

function mergeTestCase(testRunsBuilder: TestRunsBuilder, test: TestCase, options: TrxWriterOptions) {
  const { ownerAnnotation, priorityAnnotation, groupRetriesAsSingleTest } = options;
  const trxUnitTestResults = buildTrxUnitTestResultByPwTestCase(test, groupRetriesAsSingleTest);

  // TODO: use `formatTestTitle`?
  // remove root title, which is just empty
  // remove current test name
  const classNameForJs = test.titlePath().slice(1).slice(0, -1).join(NAME_SPLITTER);
  const owner = getFromAnnotationByType(test.annotations, ownerAnnotation);
  const priority = Number(getFromAnnotationByType(test.annotations, priorityAnnotation)) || undefined;

  trxUnitTestResults.forEach((trxResult, index) => {
    const testRunBuilder = testRunsBuilder.getOrCreateTestRunBuilder(index);
    testRunBuilder.addTestResult(trxResult, {
      testDefinitionAdditionalInfo: {
        owner,
        priority,
        fileLocation: test.location.file,
        className: classNameForJs,
      },
    });
  });
}

function buildTrxUnitTestResultByPwTestCase(test: TestCase, groupRetriesAsSingleTest: boolean = false): UnitTestResultType[] {
  
  if (groupRetriesAsSingleTest) {
    // Tests are grouped togeter with any retries. The last retry will have the final result (i.e. if every retry passed, the test will be marked as passed).
    const overallResult = pwTestCaseOutcome2TrxOutcome(test.outcome());

    const firstResult = test.results[0];
    const lastResult = test.results[test.results.length - 1];

    const endTime = new Date(lastResult.startTime);
    endTime.setMilliseconds(lastResult.startTime.getMilliseconds() + lastResult.duration);

    const totalDuration = lastResult.startTime.getMilliseconds() + lastResult.duration - firstResult.startTime.getMilliseconds();
    const unitTestResult = new UnitTestResultType({
      $computerName: computerName,
      $testId: convertPwId2Uuid(test.id),
      $testListId: RESULT_NOT_IN_A_LIST_ID,
      $testName: test.titlePath().slice(1).join(NAME_SPLITTER),
      $testType: UNIT_TEST_TYPE,
      $duration: formatMs2TimeSpanString(totalDuration),
      $startTime: firstResult.startTime.toISOString(),
      $endTime: endTime.toISOString(),
      $executionId: createUuid(),
      $outcome: overallResult,
    });

    for (const result of test.results) {
      bindAttachment(unitTestResult, test, result);
      bindOutput(unitTestResult, test, result);
    }
  
    return [unitTestResult];
    
  } else {
    // TODO: assert test.results is sorted by retry index.
    return test.results.map((result) => buildTrxUnitTestResultByPwTestResult(test, result));
  }
}

// TODO: copy from playwright implementation, so that it would be easy to migrate
function formatMs2TimeSpanString(ms: number) {
  return new Date(ms).toISOString().slice(11, 23);
}

function buildTrxUnitTestResultByPwTestResult(test: TestCase, result: TestResult): UnitTestResultType {
  const endTime = new Date(result.startTime);
  endTime.setMilliseconds(result.startTime.getMilliseconds() + result.duration);
  const unitTestResult = new UnitTestResultType({
    $computerName: computerName,
    $testId: convertPwId2Uuid(test.id),
    $testListId: RESULT_NOT_IN_A_LIST_ID,
    $testName: test.titlePath().slice(1).join(NAME_SPLITTER),
    $testType: UNIT_TEST_TYPE,
    $duration: formatMs2TimeSpanString(result.duration),
    $startTime: result.startTime.toISOString(),
    $endTime: endTime.toISOString(),
    $executionId: createUuid(),
    $outcome: pwOutcome2TrxOutcome(result.status),
  });

  bindAttachment(unitTestResult, test, result);
  bindOutput(unitTestResult, test, result);

  return unitTestResult;
}

function bindOutput(unitTestResult: UnitTestResultType, test: TestCase, result: TestResult) {
  // TODO: in which condition errors will have multi errors?
  // the test catch the error?
  let errorInfoMessage: string | undefined;
  let errorInfoStackTrace: string | undefined;
  if (result.error?.stack) {
    const { stack } = result.error;
    const firstStackLine = stack.indexOf('\n    at ');
    errorInfoMessage = `${stack.slice(0, firstStackLine)}`;
    errorInfoStackTrace = `\n${result.error.snippet ?? ''}\n${stack.slice(firstStackLine)}`;
  }
  const stdOutString = getStringFromStdStream(result.stdout);
  const stdErrString = getStringFromStdStream(result.stderr);
  const errorInfo: OutputType['ErrorInfo'] = (errorInfoMessage || errorInfoStackTrace) ? {
    Message: errorInfoMessage,
    StackTrace: errorInfoStackTrace,
  } : undefined;
  if (stdOutString || stdErrString || errorInfo) {
    unitTestResult.Output = {
      StdOut: (unitTestResult.Output?.StdOut ?? '') + stdOutString,
      StdErr: (unitTestResult.Output?.StdErr ?? '') + stdErrString,
      ErrorInfo: {
        Message: (unitTestResult.Output?.ErrorInfo?.Message ?? '') + (errorInfo?.Message ?? ''),
        StackTrace: (unitTestResult.Output?.ErrorInfo?.StackTrace ?? '') + (errorInfo?.StackTrace ?? ''),
      },
    };
  }
}

function bindAttachment(unitTestResult: UnitTestResultType, test: TestCase, result: TestResult) {
  const attachmentPaths: string[] = [];

  for (const attachment of result.attachments) {
    const attachmentPath = attachment.path;
    if (attachmentPath) {
      if (fs.existsSync(attachmentPath)) {
        attachmentPaths.push(attachmentPath);
      } else {
        console.warn(`File path "${attachmentPath}" is not found for Attachment "${attachment.name}"`);
      }
    }
  }

  if (attachmentPaths.length !== 0) {
    const oldAttachments = unitTestResult.ResultFiles?.ResultFile ?? [];
    unitTestResult.ResultFiles = {
      ResultFile: oldAttachments.concat(attachmentPaths.map((p) => ({ $path: p })))
    };
  }
}

function getStringFromStdStream(stdStream: (string | Buffer)[]) {
  return stdStream.map((i) => i.toString()).join();
}

function pwOutcome2TrxOutcome(outcome: TestStatus) {
  switch (outcome) {
    case 'failed':
      return TestOutcome.Failed;
    case 'interrupted':
      return TestOutcome.Aborted;
    case 'passed':
      return TestOutcome.Passed;
    case 'timedOut':
      return TestOutcome.Timeout;
    case 'skipped':
      return TestOutcome.NotExecuted;
    default:
      assertNever(outcome);
  }
}

function pwTestCaseOutcome2TrxOutcome(outcome: ReturnType<TestCase['outcome']>) {
  switch (outcome) {
    case 'unexpected':
      return TestOutcome.Failed;
    case 'expected':
      return TestOutcome.Passed;
    case 'flaky': // count flaky tests as eventually passing
      return TestOutcome.Passed
    case 'skipped':
      return TestOutcome.NotExecuted;
    default:
      assertNever(outcome);
  }
}

function getFromAnnotationByType(annotations: TestCase['annotations'], type: string) {
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index];
    if (annotation.type === type) {
      return annotation.description;
    }
  }
}

function createDummyTestRunBuilderOption(options: TestRunBuilderOptions): TestRunBuilderOptions {
  return {
    ...options,
    id: createUuid(),
    startTime: (new Date()).toISOString(),
    endTime: (new Date()).toISOString(),
  };
}

class SingleTrxWriterTestRunsBuilder implements TestRunsBuilder {
  private _builders: TestRunBuilder[] = [];

  constructor(private _options: TestRunBuilderOptions) {
  }

  getOrCreateTestRunBuilder(testResultIndex: number): TestRunBuilder {
    if (!this._builders[0]) {
      const finalOption = this._options;
      const newBuilder: TestRunBuilder = new TestRunBuilder(finalOption);
      this._builders[0] = newBuilder;
    }
    return this._builders[0];
  }

  build(): TestRunType[] {
    return this._builders.map((b) => b.build());
  }
}

class MultiTrxWriterTestRunsBuilder implements TestRunsBuilder {
  private _builders: TestRunBuilder[] = [];

  constructor(private _options: TestRunBuilderOptions) {
  }

  getOrCreateTestRunBuilder(testResultIndex: number): TestRunBuilder {
    if (!this._builders[testResultIndex]) {
      const finalOption = testResultIndex === 0 ? this._options : createDummyTestRunBuilderOption(this._options);
      const newBuilder: TestRunBuilder = new TestRunBuilder(finalOption);
      this._builders[testResultIndex] = newBuilder;
    }
    return this._builders[testResultIndex];
  }

  build(): TestRunType[] {
    return this._builders.map((b) => b.build());
  }
}

/**
 * The test cases are written into only one trx file.
 */
export class SingleTrxBuilder implements TrxsBuilder {
  analytics(rootSuite: Suite, options: TrxWriterOptions): TestRunType[] {
    const b = new SingleTrxWriterTestRunsBuilder(options.testRunBuilderOptions);
    mergeAllSuitesToTestRunBuilder(b, rootSuite, options);
    return b.build();
  }
}

/**
 * The trx cases might be written into multi trx files.
 */
export class MultiTrxsBuilder implements TrxsBuilder {
  analytics(rootSuite: Suite, options: TrxWriterOptions): TestRunType[] {
    const b = new MultiTrxWriterTestRunsBuilder(options.testRunBuilderOptions);
    mergeAllSuitesToTestRunBuilder(b, rootSuite, options);
    return b.build();
  }
}
