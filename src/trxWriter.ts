/* eslint-disable @typescript-eslint/no-use-before-define */
import type {  Suite, TestCase, TestResult, TestStatus } from '@playwright/test/reporter';
import fs from 'fs';
import { RESULT_NOT_IN_A_LIST_ID, TestRunBuilder, TestRunBuilderOptions } from './TestRunBuilder';
import { OutputType, TestOutcome, UnitTestResultType, UNIT_TEST_TYPE } from './trxModel';
import { assertNever } from './assert';
import { TestRunType } from './trxModel';
import { computerName, convertPwId2Uuid, createUuid } from './utils';

interface TrxsBuilder {
  /**
       * Analytics the root suite of playwright. And generate trx models.
       * 
       * @param rootSuite The root suite of playwright
       * @returns the generated trx models
       */
  analytics(rootSuite: Suite, options:TrxWriterOptions): TestRunType[];
}

export interface TrxWriterOptions{
  /**
   * The type of `annotation`, whose value will be the trx model's 'owner'
   */
  ownerAnnotation: string,

  /**
   * The type of `annotation`, whose value will be the trx model's 'priority'
   */
  priorityAnnotation: string,
    
  /**
   * The constructor options of `TestRunBuilder`
   */
  testRunBuilderOptions:TestRunBuilderOptions,
}

interface TestRunsBuilder { 
  /**
   * Get an existing `TestRunBuilder` or create a new one.
   * 
   * We assume that testResultIndex is the same as current retry time.
   */
  getOrCreateTestRunBuilder(testResultIndex: number): TestRunBuilder;
  build():TestRunType[];
}

function mergeAllSuitesToTestRunBuilder(testRunsBuilder: TestRunsBuilder, suite:Suite, options:TrxWriterOptions) {
  for (const projectSuite of suite.suites) {
    for (const fileSuite of projectSuite.suites) {
      mergeFileOrGroupSuite(testRunsBuilder, fileSuite, options);
    }
  }
}

function mergeFileOrGroupSuite(testRunsBuilder: TestRunsBuilder, suite: Suite, options:TrxWriterOptions) {
  if (suite.allTests().length === 0)
    return;
  suite.tests.forEach(test => {
    mergeTestCase(testRunsBuilder, test, options);
  });
  suite.suites.forEach(subSuite => {
    mergeFileOrGroupSuite(testRunsBuilder, subSuite, options);
  });
}

function mergeTestCase(testRunsBuilder: TestRunsBuilder, test: TestCase, options: TrxWriterOptions) {
  const { ownerAnnotation, priorityAnnotation } = options;
  const trxUnitTestResults = buildTrxUnitTestResultByPwTestCase(test);

  // TODO: use `formatTestTitle`?
  // remove root title, which is just empty
  // remove current test name
  const classNameForJs = test.titlePath().slice(1).slice(0, -1).join(' > ');
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

function buildTrxUnitTestResultByPwTestCase(test: TestCase): UnitTestResultType[] {
  // TODO: assert test.results is sorted by retry index.
  return test.results.map(result => buildTrxUnitTestResultByPwTestResult(test, result));
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
    $testName: test.title,
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
    const stack = result.error.stack;
    const firstStackLine = stack.indexOf('\n    at ');
    errorInfoMessage = stack.slice(0, firstStackLine);
    errorInfoStackTrace = stack.slice(firstStackLine);
  }
  const stdOutString = getStringFromStdStream(result.stdout);
  const stdErrString = getStringFromStdStream(result.stderr);
  const errorInfo: OutputType['ErrorInfo'] = (errorInfoMessage || errorInfoStackTrace) ? {
    StackTrace: errorInfoStackTrace,
    Message: errorInfoMessage,
  } : undefined;
  if (stdOutString || stdErrString || errorInfo) {
    unitTestResult.Output = {
      StdOut: stdOutString,
      StdErr: stdErrString,
      ErrorInfo: errorInfo,
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
        this.warn(`File path "${attachmentPath}" is not found for Attachment "${attachment.name}"`);
      }
    }
  }

  if (attachmentPaths.length !== 0) {
    unitTestResult.ResultFiles = {
      ResultFile: attachmentPaths.map(p => ({ $path: p })),
    };
  }
}

function getStringFromStdStream(stdStream: (string | Buffer)[]) {
  return stdStream.map(i => i.toString()).join();
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

function getFromAnnotationByType(annotations: TestCase['annotations'], type: string) {
  for (let index = annotations.length - 1; index >= 0; index--) {
    const annotation = annotations[index];
    if (annotation.type === type) {
      return annotation.description;
    }
  }
}

class SingleTrxWriterTestRunsBuilder implements TestRunsBuilder{
  private _builders: TestRunBuilder[] = [];

  getOrCreateTestRunBuilder(testResultIndex: number): TestRunBuilder {
    throw new Error('Method not implemented.');
  }

  build(): TestRunType[] {
    return this._builders.map(b=>b.build());
  } 
}

class MultiTrxWriterTestRunsBuilder implements TestRunsBuilder{
  private _builders: TestRunBuilder[] = [];

  getOrCreateTestRunBuilder(testResultIndex: number): TestRunBuilder {
    throw new Error('Method not implemented.');
  }

  build(): TestRunType[] {
    return this._builders.map(b=>b.build());
  } 
}

/**
 * The test cases are written into only one trx file.
 */
export class SingleTrxBuilder implements TrxsBuilder {
  analytics(rootSuite: Suite, options: TrxWriterOptions): TestRunType[] {
    const b = new SingleTrxWriterTestRunsBuilder();
    mergeAllSuitesToTestRunBuilder(b, rootSuite, options);
    return b.build();
  }
}

/**
 * The trx cases might be written into multi trx files.
 */
export class MultiTrxsBuilder implements TrxsBuilder {
  analytics(rootSuite: Suite, options:TrxWriterOptions): TestRunType[] {
    throw new Error('Method not implemented.');
  }
} 