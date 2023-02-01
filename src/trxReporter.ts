/* eslint-disable @typescript-eslint/no-use-before-define */
import type { FullConfig, FullResult, Reporter, Suite } from '@playwright/test/reporter';
import path from 'path';
import { promises as fsPromises } from 'fs';
import {  TestRunBuilder } from './TestRunBuilder';
import { serialize2Xml } from './serialization';
import { createUuid, runUser } from './utils';

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

    const finalRunUser = process.env[runUserEnv] || runUser;

    const testRunBuilder = new TestRunBuilder({
      id: createUuid(),
      name: `${finalRunUser} ${this.startTimeDate.toISOString()}`,
      startTime: this.startTimeDate.toISOString(),
      endTime: endTime.toISOString(),
      runUser: finalRunUser,
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
}
