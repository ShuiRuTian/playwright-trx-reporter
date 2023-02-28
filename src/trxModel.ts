// basically we just keep the same as xsd.
// The difference:
// - ResultSummary has a type
// - Times has a type
// make something from optional to required.

// all property should be just the same as Element tag name.
// otherwise you should change the corresponding impl in serialization.ts

// give it a unique type, so that we get type check correctly.
export type IDSimpleType = string & { __idSimpleType: void };

export const UNIT_TEST_TYPE: IDSimpleType = '13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b' as IDSimpleType;

class ResultFilesType {
  ResultFile?: {
    $path: string;
  }[];
}

export class ResultSummary {
  $outcome: string;

  Counters: CountersType;

  constructor(props: ResultSummary) {
    this.$outcome = props.$outcome;
    this.Counters = props.Counters;
  }
}

export class WorkItemIDsType {
  WorkItem?: {
    $id: string;//IDSimpleType
  }[];
}

abstract class BaseTestType {
  $enabled?: boolean;

  $id: IDSimpleType;

  $name: string;

  $isGroupable?: boolean;

  $priority?: number;

  $namedCategory?: string;

  $storage?: string;

  Description?: string;

  Owners?: { Owner: { $name: string; }[] };

  Execution?: {
    $id?: IDSimpleType;

    $parentId?: IDSimpleType;

    isRunOnRestart?: boolean;

    timeOut?: number;
  };

  WorkItemIDs?: WorkItemIDsType;

  constructor(props: BaseTestType) {
    this.$enabled = props.$enabled;
    this.$id = props.$id;
    this.$name = props.$name;
    this.$isGroupable = props.$isGroupable;
    this.$priority = props.$priority;
    this.$namedCategory = props.$namedCategory;
    this.$storage = props.$storage;
    this.Owners = props.Owners;
    this.Description = props.Description;
    this.Execution = props.Execution;
    this.WorkItemIDs = props.WorkItemIDs;
  }
}

export class UnitTestType extends BaseTestType {
  TestMethod: {
    $codeBase: string;
    $className: string;
    $name: string;
    $isValid?: boolean;
    $adapterTypeName?: string;
  };

  constructor(props: UnitTestType) {
    super(props);
    this.TestMethod = props.TestMethod;
  }
}

export class TestResultType {
  $testName: string;

  $testType: IDSimpleType;

  $testId: IDSimpleType;

  $testListId: IDSimpleType;

  $computerName: string;

  $executionId?: IDSimpleType;

  //   $parentExecutionId?: IDSimpleType;

  $outcome?: TestOutcome;

  //   $relativeResultsDirectory?: string;

  $startTime?: string;

  $endTime?: string;

  $duration?: string;

  //   $spoolMessage?: boolean;

  //   $processExitCode?: number;

  //   $isAborted?: boolean;

  //   $relativeTestOutputDirectory?: string;

  Output?: OutputType;

  ResultFiles?: ResultFilesType;

  constructor(props: TestResultType) {
    this.$testName = props.$testName;
    this.$testType = props.$testType;
    this.$testId = props.$testId;
    this.$executionId = props.$executionId;
    //this.$parentExecutionId = props.$parentExecutionId;
    this.$testListId = props.$testListId;
    this.$outcome = props.$outcome;
    this.$computerName = props.$computerName;
    //this.$relativeResultsDirectory = props.$relativeResultsDirectory;
    this.$startTime = props.$startTime;
    this.$endTime = props.$endTime;
    this.$duration = props.$duration;
    //this.$spoolMessage = props.$spoolMessage;
    //this.$processExitCode = props.$processExitCode;
    //this.$isAborted = props.$isAborted;
    //this.$relativeTestOutputDirectory = props.$relativeTestOutputDirectory;
    this.Output = props.Output;
    this.ResultFiles = props.ResultFiles;
  }
}

export class TestResultAggregationType extends TestResultType {
  Counters?: CountersType;

  //   InnerResults?: ResultsType;

  constructor(props: TestResultAggregationType) {
    super(props);

    this.Counters = props.Counters;

    // this.InnerResults = props.InnerResults ;
  }
}

export class UnitTestResultType extends TestResultAggregationType {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(props: UnitTestResultType) {
    super(props);
  }
}

export class TestDefinitionType {
  UnitTest?: UnitTestType[];

  constructor(props: TestDefinitionType) {
    this.UnitTest = props.UnitTest;
  }
}


export class TestEntryType {
  //    TcmInformation?: TcmInformationType;

  TestEntries?: TestEntryType[];

  $testId: IDSimpleType;

  $executionId: IDSimpleType;

  //    $parentExecutionId?: IDSimpleType;

  $testListId: IDSimpleType;

  //    $isTransparent?: boolean;

  constructor(props: TestEntryType) {
    //   this.TcmInformation = (props.TcmInformation) ? new TcmInformationType(props.TcmInformation) : undefined;
    this.TestEntries = props.TestEntries;
    this.$testId = props.$testId;
    this.$executionId = props.$executionId;
    //   this.$parentExecutionId = props.$parentExecutionId;
    this.$testListId = props.$testListId;
    // this.$isTransparent = props.$isTransparent;
  }
}

export class TestEntriesType {
  TestEntry?: TestEntryType[];

  constructor(props: TestEntriesType) {
    this.TestEntry = props.TestEntry;
  }
}


export class TestListType {
  //   RunConfiguration?: LinkType;

  //   TestLinks?: LinkType[];

  $id: IDSimpleType;

  $name: string;

  $enabled?: boolean;

  $parentListId?: IDSimpleType;

  constructor(props: TestListType) {
    // this.RunConfiguration = (props.RunConfiguration) ? new LinkType(props.RunConfiguration) : undefined;
    // this.TestLinks = props.TestLinks?.map(o => new LinkType(o));
    this.$id = props.$id;
    this.$name = props.$name;
    this.$enabled = props.$enabled;
    this.$parentListId = props.$parentListId;
  }
}

export class OutputType {
  StdOut?: string;

  // Is this needed when we choose to use ErrorInfo.Message?
  // Could we distinguish err stream and exception?
  StdErr?: string;

  ErrorInfo?: {
    Message?: string;
    StackTrace?: string;
  };
}

export class ResultsType {
  UnitTestResult?: UnitTestResultType[];

  constructor(props: ResultsType) {
    this.UnitTestResult = props.UnitTestResult;
  }
}

export class Times {
  $creation?: string;

  $queuing?: string;

  $start: string;

  $finish?: string;

  constructor(props: Times) {
    this.$creation = props.$creation;
    this.$queuing = props.$queuing;
    this.$start = props.$start;
    this.$finish = props.$finish;
  }
}

export class TestRunType {
  $id: IDSimpleType;

  $name: string;

  $runUser?: string;

  private readonly $xmlns?: string = 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010';

  //   $tcmPassId?: number;
  Times?: Times;

  Results?: ResultsType;

  TestDefinitions?: TestDefinitionType;

  TestEntries?: TestEntriesType;

  TestLists?: {
    TestList?: TestListType[];
  };

  ResultSummary?: ResultSummary;

  constructor(props: TestRunType) {
    this.$id = props.$id;
    this.$name = props.$name;
    this.$runUser = props.$runUser;
    //   this.$tcmPassId = props.$tcmPassId;
  }
}

export enum TestOutcome {
  Error = 'Error',
  Failed = 'Failed',
  Timeout = 'Timeout',
  Aborted = 'Aborted',
  Inconclusive = 'Inconclusive',
  PassedButRunAborted = 'PassedButRunAborted',
  NotRunnable = 'NotRunnable',
  NotExecuted = 'NotExecuted',
  Disconnected = 'Disconnected',
  Warning = 'Warning',
  Passed = 'Passed',
  Completed = 'Completed',
  InProgress = 'InProgress',
  Pending = 'Pending',
}

export class CountersType {
  $total = 0;

  $executed = 0;

  $passed = 0;

  $failed = 0;

  $error = 0;

  $timeout = 0;

  $aborted = 0;

  $inconclusive = 0;

  $passedButRunAborted = 0;

  $notRunnable = 0;

  $notExecuted = 0;

  $disconnected = 0;

  $warning = 0;

  $completed = 0;

  $inProgress = 0;

  $pending = 0;

  $value?: string;
}