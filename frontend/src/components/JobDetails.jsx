import React from 'react'
import { gql, useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react'

const GET_JOB_BY_ID = gql`
  query GetJobById($id: BigInt!) {
    allJobs(filter: { id: { equalTo: $id } }) {
      nodes {
        id
        taskIdentifier
        queueName
        key
        priority
        runAt
        attempts
        maxAttempts
        lastError
        createdAt
        updatedAt
        lockedAt
        _privateJobById {
            payload
        }
      }
    }
  }
`

const Row = ({ label, value, mono }) => (
  <div className="grid grid-cols-3 gap-4 py-2">
    <div className="text-sm text-gray-500">{label}</div>
    <div className={`col-span-2 text-sm ${mono ? 'font-mono break-all' : 'text-gray-900'}`}>
      {value ?? '-'}
    </div>
  </div>
)

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
)

const JobDetails = ({ jobId, onRefresh }) => {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useQuery(GET_JOB_BY_ID, {
    variables: { id: String(jobId) },
    skip: !jobId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 10000,
  })

  const job = data?.allJobs?.nodes?.[0]
  const jobPayload = job?._privateJobById?.payload

  if (loading && !job) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Failed to load job</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </button>
        </div>
        <div className="text-sm text-red-600">{error.message}</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-sm text-gray-600">Job not found.</div>
      </div>
    )
  }

  const status = job.lockedAt
    ? 'running'
    : job.lastError
    ? 'failed'
    : job.attempts > 0
    ? 'completed'
    : 'pending'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Jobs
        </button>
        <button
          onClick={() => { refetch(); onRefresh && onRefresh() }}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </button>
      </div>

      <Section title={`Job #${job.id}`}>
        <Row label="Status" value={status} />
        <Row label="Task" value={job.taskIdentifier} />
        <Row label="Queue" value={job.queueName} />
        <Row label="Key" value={job.key} mono />
        <Row label="Priority" value={job.priority} />
        <Row label="Run At" value={job.runAt ? new Date(job.runAt).toLocaleString() : '-'} />
        <Row label="Attempts" value={`${job.attempts ?? 0} / ${job.maxAttempts ?? '-'}`} />
        <Row label="Created" value={job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'} />
        <Row label="Updated" value={job.updatedAt ? new Date(job.updatedAt).toLocaleString() : '-'} />
        <Row label="Locked At" value={job.lockedAt ? new Date(job.lockedAt).toLocaleString() : '-'} />
      </Section>

      <Section title="Payload">
        <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
{typeof jobPayload === 'string' ? jobPayload : JSON.stringify(jobPayload, null, 2)}
        </pre>
      </Section>

      {job.lastError && (
        <Section title="Last Error">
          <pre className="text-sm bg-red-50 p-4 rounded-lg overflow-auto max-h-96 text-red-800">
{job.lastError}
          </pre>
        </Section>
      )}
    </div>
  )
}

export default JobDetails
