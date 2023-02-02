/* eslint-disable @typescript-eslint/no-use-before-define */
import type { FullConfig, FullResult, Reporter, Suite } from '@playwright/test/reporter';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { TestRunBuilder } from './TestRunBuilder';
import { serialize2Xml } from './serialization';
import { createUuid, runUser } from './utils';
import { MultiTrxsBuilder, SingleTrxBuilder } from './trxWriter';

interface OutputFilesInfo {
  folder: string,
  prefirx: string,
}

export interface TrxReporterOptions {
  /**
   * Azure DevOps supports "Rerun failed tests". But we need to generate multi trx files and publish them all.
   * @see {@link https://learn.microsoft.com/en-us/azure/devops/pipelines/test/review-continuous-test-results-after-build?view=azure-devops#view-summarized-test-results}
   * @example "./reporter/output.trx"
   * @example {folder: "./reporter", prefirx: "output"} // the reports will be generated as "./reporter/output_1.trx", "./reporter/output_2.trx" and so on.
   */
  outputFile?: string | OutputFilesInfo;
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

type OutputFileInfo = string | OutputFilesInfo | undefined;

export class TrxReporter implements Reporter {

  private config!: FullConfig;

  private suite!: Suite;

  private startTimeDate!: Date;

  private outputFileInfo: OutputFileInfo;

  private totalTestCount!: number;

  private ownerAnnotation: string;

  private priorityAnnotation: string;

  constructor(options: TrxReporterOptions = {}) {
    const outputFilePath = (typeof options.outputFile === 'string' ? options.outputFile : undefined) || process.env[outputFileEnv];
    this.outputFileInfo = outputFilePath ?? options.outputFile;
    this.ownerAnnotation = options.ownerAnnotation ?? 'owner';
    this.priorityAnnotation = options.priorityAnnotation ?? 'priority';
  }

  log(str: string) {
    console.log(logPrefix + str);
  }

  warn(str: string) {
    console.log(logPrefix + str);
  }

  printsToStdio() {
    return !this.outputFileInfo;
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

    const finalTrxsBuilder = typeof this.outputFileInfo === 'string' ? new SingleTrxBuilder() : new MultiTrxsBuilder();

    const testRuns = finalTrxsBuilder.analytics(this.suite, {
      ownerAnnotation: this.ownerAnnotation,
      priorityAnnotation: this.priorityAnnotation,
      testRunBuilderOptions: {
        id: createUuid(),
        name: `${finalRunUser} ${this.startTimeDate.toISOString()}`,
        startTime: this.startTimeDate.toISOString(),
        endTime: endTime.toISOString(),
        runUser: finalRunUser,
        pwSummaryOutcome: result.status,
      },
    });

    const tasks = testRuns.map(async (testRun, index) => {
      const lines: string[] = [];
      serialize2Xml(lines, 'TestRun', testRun, true);
      const reportString = lines.join('\n');

      const outputFile = getFilePath(this.outputFileInfo, index);

      if (outputFile) {
        await fsPromises.mkdir(path.dirname(outputFile), { recursive: true });
        await fsPromises.writeFile(outputFile, reportString);
      } else {
        console.log(reportString);
      }
    });

    await Promise.all(tasks);
  }
}

function getFilePath(info: OutputFileInfo, index: number): string | undefined{ 
  switch (true) {
    // single file output
    case typeof info === 'string':
      return info as string;
    // multi file output
    case typeof info === 'object':
      return (info as OutputFilesInfo).folder + (info as OutputFilesInfo).prefirx;
    // console output
    case typeof info === 'undefined':
      return undefined;
  }
}