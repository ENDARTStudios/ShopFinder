/**
 * @workspace/database/tests — Repository Contract Test Suite + Mapper Snapshot Tests
 *
 * Per Rec 2 & 3 of 04B.3 feedback: abstract test suites for consistent behavior.
 */

export { runRepositoryContractTests, runMapperSnapshotTest } from "./contract-suite";
export type {
  RepositoryContractSuiteConfig,
  ContractTestResult,
  MapperSnapshotTestConfig
} from "./contract-suite";
