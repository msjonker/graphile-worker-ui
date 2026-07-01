import { gql } from '@apollo/client';

// Flexible, filtered browsing of jobs. Uses the `jobs` view (allJobs) which
// resolves task_identifier and queue_name for us.
export const GET_JOBS = gql`
  query Jobs($first: Int!, $offset: Int!, $orderBy: [JobsOrderBy!], $filter: JobFilter) {
    allJobs(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
      totalCount
      nodes {
        id
        queueName
        taskIdentifier
        priority
        runAt
        attempts
        maxAttempts
        lastError
        createdAt
        updatedAt
        key
        lockedAt
        lockedBy
        revision
        flags
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

// Detail comes from _PrivateJob (has the payload + isAvailable), joined back to
// the view for the human-readable task/queue names.
export const GET_JOB_DETAIL = gql`
  query JobDetail($id: BigInt!) {
    _privateJobById(id: $id) {
      id
      payload
      priority
      runAt
      attempts
      maxAttempts
      lastError
      createdAt
      updatedAt
      key
      lockedAt
      lockedBy
      revision
      flags
      isAvailable
      jobById {
        taskIdentifier
        queueName
      }
    }
  }
`;

// Distinct task identifiers for filter dropdowns.
export const GET_TASK_OPTIONS = gql`
  query TaskOptions {
    allJobs {
      groupedAggregates(groupBy: TASK_IDENTIFIER) {
        keys
      }
    }
  }
`;
