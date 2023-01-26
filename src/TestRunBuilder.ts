import type { FullResult } from '@playwright/test/reporter';
import { CountersType, IDSimpleType, ResultsType, ResultSummary, TestDefinitionType, TestEntriesType, TestEntryType, TestListType, TestOutcome, TestRunType, Times, UnitTestResultType, UnitTestType, WorkItemIDsType } from './trxModel';
import { assertNever } from './assert';

// Magic number
// Copied from an existing trx file
export const RESULT_NOT_IN_A_LIST_ID: IDSimpleType = '8c84fa94-04c1-424b-9868-57a2d4851a1d' as IDSimpleType;
export const ALL_LOADED_RESULTS_ID: IDSimpleType = '19431567-8539-422a-85d7-44ee4e166bda' as IDSimpleType;
export const resultsNotInAList = new TestListType({ $id: RESULT_NOT_IN_A_LIST_ID, $name: 'Results Not in a List' });
export const allLoadedResults = new TestListType({ $id: ALL_LOADED_RESULTS_ID, $name: 'All Loaded Results' });

export interface TestRunBuilderOptions {
  id: IDSimpleType;
  name: string;
  runUser: string;
  startTime: string;
  endTime: string;
  pwSummaryOutcome: FullResult['status'];
}

export interface AddTestResultOptions {
  testDefinitionAdditionalInfo: {
    owner?: string;
    priority?: number;
    workItemIds?: string[];
    fileLocation: string;
    /**
     * Use the title path(not including current title) as "class name" for js.
     */
    className: string;
  }
}

export class TestRunBuilder {
  private _testRun: TestRunType;

  private _Results: ResultsType;

  private _TestDefinitions: TestDefinitionType;

  private _TestEntries: TestEntriesType;

  private _TestLists: { TestList: TestListType[] };

  private _ResultSummary: ResultSummary;

  private _Times: Times;

  constructor(options: TestRunBuilderOptions) {
    const { id, name, runUser, pwSummaryOutcome: summaryOutcome, endTime, startTime } = options;
    this._testRun = new TestRunType({ $id: id, $name: name, $runUser: runUser });
    this._ResultSummary = new ResultSummary({
      $outcome: this.getTrxSummaryOutCome(summaryOutcome),
      Counters: new CountersType(),
    });
    this._Results = new ResultsType({ UnitTestResult: [] });
    this._TestDefinitions = new TestDefinitionType({ UnitTest: [] });
    this._TestEntries = new TestEntriesType({ TestEntry: [] });
    this._TestLists = {
      TestList: [
        resultsNotInAList,
        allLoadedResults,
      ],
    };
    this._Times = new Times({
      $creation: startTime,
      $finish: endTime,
    });
  }

  // in which condition should we add other test type?
  addTestResult(testResult: UnitTestResultType, options: AddTestResultOptions) {
    const { testDefinitionAdditionalInfo } = options;
    const { owner, priority, fileLocation, workItemIds, className } = testDefinitionAdditionalInfo;

    // add test definition
    const unitTest: UnitTestType = new UnitTestType({
      $id: testResult.$testId,
      $name: testResult.$testName,
      $priority: priority,
      $storage: fileLocation,
      Owners: owner ? {
        Owner: [{ $name: owner }],
      } : undefined,
      WorkItemIDs: workItemIds ?
        { WorkItem: workItemIds.map(item => ({ $id: item })) }
        : undefined,
      TestMethod: {
        $className: className,
        $codeBase: fileLocation,
        $name: testResult.$testName,
      },
    });

    // One test might be run more than once due to flaky.
    // Only add the definition once.
    if (this._TestDefinitions?.UnitTest?.every((t => t.$id !== unitTest.$id)))
      this._TestDefinitions?.UnitTest?.push(unitTest);

    // add test entry
    const testEntry = new TestEntryType({
      $executionId: testResult.$executionId!,
      $testId: testResult.$testId,
      $testListId: testResult.$testListId,
    });
    this._TestEntries.TestEntry?.push(testEntry);

    // add test result
    this._Results.UnitTestResult?.push(testResult);

    // counter
    this.count(testResult.$outcome);
  }

  private count(outCome: string | undefined) {
    this._ResultSummary.Counters.$total += 1;

    switch (outCome) {
      case TestOutcome.Aborted:
        this._ResultSummary.Counters.$aborted += 1;
        break;
      case TestOutcome.Inconclusive:
        this._ResultSummary.Counters.$executed += 1;
        this._ResultSummary.Counters.$inconclusive += 1;
        break;
      case TestOutcome.Failed:
        this._ResultSummary.Counters.$executed += 1;
        this._ResultSummary.Counters.$failed += 1;
        break;
      case TestOutcome.Passed:
        this._ResultSummary.Counters.$executed += 1;
        this._ResultSummary.Counters.$passed += 1;
        break;
      case TestOutcome.Timeout:
        this._ResultSummary.Counters.$executed += 1;
        this._ResultSummary.Counters.$timeout += 1;
        break;
      case TestOutcome.NotExecuted:
        this._ResultSummary.Counters.$notExecuted += 1;
    }
  }

  private getTrxSummaryOutCome(outcome: FullResult['status']) {
    switch (outcome) {
      case 'failed':
        return TestOutcome.Failed;
      case 'interrupted':
        return TestOutcome.Aborted;
      case 'passed':
        return TestOutcome.Passed;
      case 'timedout':
        return TestOutcome.Timeout;
      default:
        assertNever(outcome);
    }
  }

  // this is not a real builder, you should not build twice.
  build(): TestRunType {
    this._testRun.ResultSummary = this._ResultSummary;
    this._testRun.Results = this._Results;
    this._testRun.TestDefinitions = this._TestDefinitions;
    this._testRun.TestEntries = this._TestEntries;
    this._testRun.TestLists = this._TestLists;
    this._testRun.Times = this._Times;
    return this._testRun;
  }
}