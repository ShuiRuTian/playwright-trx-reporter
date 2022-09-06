/* eslint-disable @typescript-eslint/no-use-before-define */
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStatus } from '@playwright/test/reporter';
import * as uuid from 'uuid';
import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import os from 'os';
import { RESULT_NOT_IN_A_LIST_ID, TestRunBuilder } from './TestRunBuilder';
import { IDSimpleType, OutputType, TestOutcome, UnitTestResultType, UNIT_TEST_TYPE } from './trxModel';
import { assertNever } from './assert';
import { serialize2Xml } from './serialization';

// TODO: copy from playwright implementation, so that it would be easy to migrate
function formatMs2TimeSpanString(ms: number) {
  return new Date(ms).toISOString().slice(11, 23);
}

interface TrxReporterOptions {
  outputFile?: string;
  /**
   * Set owner for each test case from annotation.
   * 
   * Use the last value if it appears multi times.
   * 
   * @default "owner"
   */
  ownerAnnotation?: string;
  /**
   * Set priority for each test case from annotation.
   * 
   * Use the last value if it appears multi times.
   * 
   * @default "priority"
   */
  priorityAnnotation?: string;
}

const outputFileEnv = 'PLAYWRIGHT_TRX_OUTPUT_NAME';
const runUserEnv = 'PLAYWRIGHT_TRX_RUN_USER_NAME';
const logPrefix = 'pw_trx_reporter: ';

export class TrxReporter implements Reporter {

  private config!: FullConfig;

  private suite!: Suite;

  private startTimeDate!: Date;

  private outputFile: string | undefined;

  private totalTestCount!: number;

  private computerName: string = os.hostname();

  private userName: string = os.userInfo().username;

  private ownerAnnotation: string;

  private priorityAnnotation: string;

  constructor(options: TrxReporterOptions = {}) {
    this.outputFile = options.outputFile || process.env[outputFileEnv];
    this.ownerAnnotation = options.ownerAnnotation || 'owner';
    this.priorityAnnotation = options.priorityAnnotation || 'priority';
  }

  log(str: string) {
    console.log(logPrefix + str);
  }

  warn(str: string) {
    console.log(logPrefix + str);
  }

  printsToStdio() {
    return !this.outputFile;
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
    this.startTimeDate = new Date();
    this.totalTestCount = suite.allTests().length;
  }

  async onEnd(result: FullResult) {
    const endTime = new Date();

    const runUser = process.env[runUserEnv] || `${this.computerName}\\${this.userName}`;

    const testRunBuilder = new TestRunBuilder({
      id: createUuid(),
      name: `${runUser} ${this.startTimeDate.toISOString()}`,
      startTime: this.startTimeDate.toISOString(),
      endTime: endTime.toISOString(),
      runUser: runUser,
      pwSummaryOutcome: result.status,
    });

    this._mergeAllSuitesToTestRunBuilder(testRunBuilder);

    const testRun = testRunBuilder.build();

    const lines: string[] = [];
    serialize2Xml(lines, 'TestRun', testRun, true);
    const reportString = lines.join('\n');

    const outputFile = this.outputFile;

    if (outputFile) {
      await fsPromises.mkdir(path.dirname(outputFile), { recursive: true });
      await fsPromises.writeFile(outputFile, reportString);
    } else {
      console.log(reportString);
    }
  }

  private _mergeAllSuitesToTestRunBuilder(testRunBuilder: TestRunBuilder) {
    for (const projectSuite of this.suite.suites) {
      for (const fileSuite of projectSuite.suites) {
        this._mergeFileOrGroupSuite(testRunBuilder, fileSuite);
      }
    }
  }

  private _mergeFileOrGroupSuite(testRunBuilder: TestRunBuilder, suite: Suite) {
    if (suite.allTests().length === 0)
      return;
    suite.tests.forEach(test => {
      this._mergeTestCase(testRunBuilder, test);
    });
    suite.suites.forEach(subSuite => {
      this._mergeFileOrGroupSuite(testRunBuilder, subSuite);
    });
  }

  private _mergeTestCase(testRunBuilder: TestRunBuilder, test: TestCase) {
    const trxUnitTestResults = this._buildTrxUnitTestResultByPwTestCase(test);

    // TODO: use `formatTestTitle`?
    // remove root title, which is just empty
    // remove current test name
    const classNameForJs = test.titlePath().slice(1).slice(0, -1).join(' > ');
    const owner = getFromAnnotationByType(test.annotations, this.ownerAnnotation);
    const priority = Number(getFromAnnotationByType(test.annotations, this.priorityAnnotation)) || undefined;

    trxUnitTestResults.forEach(trxResult => {
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

  // TODO: support aggregate test result, so that we only need return UnitTestResultType
  private _buildTrxUnitTestResultByPwTestCase(test: TestCase): UnitTestResultType[] {
    return test.results.map(result => this._buildTrxUnitTestResultByPwTestResult(test, result));
  }

  private _buildTrxUnitTestResultByPwTestResult(test: TestCase, result: TestResult): UnitTestResultType {
    const endTime = new Date(result.startTime);
    endTime.setMilliseconds(result.startTime.getMilliseconds() + result.duration);

    const unitTestResult = new UnitTestResultType({
      $computerName: this.computerName,
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

    this.bindAttachment(unitTestResult, test, result);
    this.bindOutput(unitTestResult, test, result);

    return unitTestResult;
  }

  private bindOutput(unitTestResult: UnitTestResultType, test: TestCase, result: TestResult) {
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

  private bindAttachment(unitTestResult: UnitTestResultType, test: TestCase, result: TestResult) {
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

// generated by https://www.uuidgenerator.net/
const PW_TRX_REPORTER_NAMESPACE = 'e2d7181b-0942-4431-a44c-ad5686b2a530';

function convertPwId2Uuid(id: string): IDSimpleType {
  return uuid.v5(id, PW_TRX_REPORTER_NAMESPACE) as IDSimpleType;
}

function createUuid(): IDSimpleType {
  return uuid.v4() as IDSimpleType;
}

function getFromAnnotationByType(annotations: TestCase['annotations'], type: string) {
  for (let index = annotations.length - 1; index >= 0; index--) {
    const annotation = annotations[index];
    if (annotation.type === type) {
      return annotation.description;
    }
  }
}