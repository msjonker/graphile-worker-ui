import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'
import { 
  Play, 
  RotateCcw, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react'
import Pagination from './Pagination'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'

// Paginated query for JobList component (server-side filtering)
const GET_PAGINATED_JOBS_QUERY = gql`
  query GetPaginatedJobs($first: Int, $offset: Int, $orderBy: [JobsOrderBy!], $filter: JobFilter) {
    allJobs(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
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
        _privateJobById {
          payload
        }
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// Efficient unique task identifiers via aggregates
const GET_UNIQUE_TASKS = gql`
  query GetUniqueTasks {
    allJobs {
      groupedAggregates(groupBy: TASK_IDENTIFIER) {
        keys
      }
    }
  }
`

// Efficient unique queue names via aggregates
const GET_UNIQUE_QUEUES = gql`
  query GetUniqueQueues {
    allJobs {
      groupedAggregates(groupBy: QUEUE_NAME) {
        keys
      }
    }
  }
`

const RETRY_JOB_MUTATION = gql`
  mutation RetryJob($jobId: String!) {
    retryJob(jobId: $jobId)
  }
`

const CANCEL_JOB_MUTATION = gql`
  mutation CancelJob($jobId: String!) {
    cancelJob(jobId: $jobId)
  }
`

const COMPLETE_JOB_MUTATION = gql`
  mutation CompleteJob($jobId: String!) {
    completeJob(jobId: $jobId)
  }
`

const JobList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all')
  const [taskFilter, setTaskFilter] = useState(() => searchParams.get('task') || 'all')
  const [queueFilter, setQueueFilter] = useState(() => searchParams.get('queue') || 'all')
  const [currentPage, setCurrentPage] = useState(() => {
    const p = parseInt(searchParams.get('page') || '1', 10)
    return Number.isFinite(p) && p > 0 ? p - 1 : 0
  })
  const [pageSize] = useState(25) // 25 jobs per page
  const [expandedId, setExpandedId] = useState(null)
  const didMountRef = useRef(false)
  const updatingFromUrlRef = useRef(false)

  // Reset to first page when filters/search change (skip first render and URL-driven updates)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (updatingFromUrlRef.current) {
      // This state change came from URL; don't override page
      updatingFromUrlRef.current = false
      return
    }
    setCurrentPage(0)
  }, [statusFilter, taskFilter, queueFilter, searchTerm])

  // Keep URL in sync with state (use 1-based page in URL)
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('q', searchTerm)
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    if (taskFilter && taskFilter !== 'all') params.set('task', taskFilter)
    if (queueFilter && queueFilter !== 'all') params.set('queue', queueFilter)
    const pageOneBased = (currentPage || 0) + 1
    if (pageOneBased !== 1) params.set('page', String(pageOneBased))
    const paramsStr = params.toString()
    const currentStr = searchParams.toString()
    if (paramsStr !== currentStr) {
      setSearchParams(params)
    }
  }, [searchTerm, statusFilter, taskFilter, queueFilter, currentPage, setSearchParams])

  // Update state if URL changes (e.g., browser back/forward)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    const status = searchParams.get('status') || 'all'
    const task = searchParams.get('task') || 'all'
    const queue = searchParams.get('queue') || 'all'
    const p = parseInt(searchParams.get('page') || '1', 10)
    const pageIdx = Number.isFinite(p) && p > 0 ? p - 1 : 0

    // Mark that we're syncing from URL to avoid resetting page
    updatingFromUrlRef.current = true
    if (q !== searchTerm) setSearchTerm(q)
    if (status !== statusFilter) setStatusFilter(status)
    if (task !== taskFilter) setTaskFilter(task)
    if (queue !== queueFilter) setQueueFilter(queue)
    if (pageIdx !== currentPage) setCurrentPage(pageIdx)
  }, [searchParams])

  // Build GraphQL filter (connection filter) based on filters
  const buildFilter = () => {
    const filter = {}
    if (taskFilter !== 'all') {
      filter.taskIdentifier = { equalTo: taskFilter }
    }
    if (queueFilter !== 'all') {
      filter.queueName = { equalTo: queueFilter }
    }
    switch (statusFilter) {
      case 'running':
        filter.lockedAt = { isNull: false }
        break
      case 'failed':
        filter.and = [
          { lastError: { isNull: false } },
          { lockedAt: { isNull: true } }
        ]
        break
      case 'completed':
        filter.and = [
          { attempts: { greaterThan: 0 } },
          { lastError: { isNull: true } },
          { lockedAt: { isNull: true } }
        ]
        break
      case 'pending':
        // Approximate: never started and not locked
        filter.and = [
          { lockedAt: { isNull: true } },
          { attempts: { equalTo: 0 } }
        ]
        break
      default:
        break
    }
    return Object.keys(filter).length > 0 ? filter : undefined
  }

  const { data, loading, error, refetch } = useQuery(GET_PAGINATED_JOBS_QUERY, {
    variables: {
      first: pageSize,
      offset: currentPage * pageSize,
      orderBy: ['CREATED_AT_DESC'],
      filter: buildFilter()
    },
    pollInterval: 5000, // Poll every 5 seconds for updates
  })

  // Load unique task identifiers via Apollo useQuery
  const { data: tasksData, loading: tasksLoading, error: tasksError } = useQuery(GET_UNIQUE_TASKS, {
    fetchPolicy: 'network-only',
  })

  // Load unique queue names via Apollo useQuery
  const { data: queuesData, loading: queuesLoading, error: queuesError } = useQuery(GET_UNIQUE_QUEUES, {
    fetchPolicy: 'network-only',
  })

  const jobs = data?.allJobs?.nodes || []
  const totalCount = data?.allJobs?.totalCount || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = data?.allJobs?.pageInfo?.hasNextPage
  const hasPreviousPage = data?.allJobs?.pageInfo?.hasPreviousPage

  const [retryJob] = useMutation(RETRY_JOB_MUTATION)
  const [cancelJob] = useMutation(CANCEL_JOB_MUTATION)
  const [completeJob] = useMutation(COMPLETE_JOB_MUTATION)

  // Derive unique tasks from aggregates result
  const uniqueTasks = (tasksData?.allJobs?.groupedAggregates || [])
    .map(g => Array.isArray(g?.keys) ? g.keys[0] : null)
    .filter(Boolean)
    .sort()

  const uniqueQueues = (queuesData?.allJobs?.groupedAggregates || [])
    .map(g => Array.isArray(g?.keys) ? g.keys[0] : null)
    .filter(Boolean)
    .sort()

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const ti = job.taskIdentifier || ''
    const matchesSearch = !searchTerm || 
      ti.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.queueName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.key?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || getJobStatus(job) === statusFilter
    const matchesTask = taskFilter === 'all' || job.taskIdentifier === taskFilter
    const matchesQueue = queueFilter === 'all' || job.queueName === queueFilter

    return matchesSearch && matchesStatus && matchesTask && matchesQueue
  })

  function getJobStatus(job) {
    // Determine status similarly to dashboard counts
    if (job.lockedAt) return 'running'
    if (job.lastError && !job.lockedAt) return 'failed'
    if (job.attempts > 0 && !job.lastError && !job.lockedAt) return 'completed'
    return 'pending'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return Play
      case 'failed': return AlertCircle
      case 'completed': return CheckCircle
      case 'pending': return Clock
      default: return Clock
    }
  }

  // Reset to first page when filters change
  const handleFilterChange = (filterType, value) => {
    setCurrentPage(0)
    if (filterType === 'status') setStatusFilter(value)
    if (filterType === 'task') setTaskFilter(value)
    if (filterType === 'search') setSearchTerm(value)
  }

  const handleRetryJob = async (jobId, e) => {
    e.stopPropagation()
    try {
      await retryJob({ variables: { jobId } })
      toast.success('Job retry scheduled')
      refetch()
    } catch (error) {
      toast.error(`Failed to retry job: ${error.message}`)
    }
  }

  const handleCancelJob = async (jobId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to cancel this job?')) return
    
    try {
      await cancelJob({ variables: { jobId } })
      toast.success('Job cancelled')
      refetch()
    } catch (error) {
      toast.error(`Failed to cancel job: ${error.message}`)
    }
  }

  const handleCompleteJob = async (jobId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to mark this job as complete?')) return
    
    try {
      await completeJob({ variables: { jobId } })
      toast.success('Job marked as complete')
      refetch()
    } catch (error) {
      toast.error(`Failed to complete job: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="ml-4">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show GraphQL errors explicitly to aid debugging
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Jobs</h2>
        </div>
        <div className="p-6">
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="text-sm text-red-700">
              {error.message}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Jobs ({totalCount.toLocaleString()} total)
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={taskFilter}
            onChange={(e) => handleFilterChange('task', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Tasks</option>
            {uniqueTasks.map(task => (
              <option key={task} value={task}>{task}</option>
            ))}
          </select>

          <select
            value={queueFilter}
            onChange={(e) => handleFilterChange('queue', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Queues</option>
            {uniqueQueues.map(queue => (
              <option key={queue} value={queue}>{queue}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Pagination Controls */}
      {totalPages > 1 && (
        <Pagination
          top
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={(p) => setCurrentPage(p)}
        />
      )}

      {/* Job List */}
      <div className="divide-y divide-gray-200">
        {filteredJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const status = getJobStatus(job);
            const StatusIcon = getStatusIcon(status);
            const isExpanded = expandedId === job.id;

            return (
              <div
                key={job.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors border-b ${
                  isExpanded ? 'bg-blue-50' : ''
                }`}
                onClick={() => setExpandedId(isExpanded ? null : job.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <StatusIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {job.taskIdentifier}
                      </p>
                      {job.queueName && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {job.queueName}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <span>
                        Created {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                      {job.runAt && new Date(job.runAt) > new Date() && (
                        <span className="ml-2">
                          • Scheduled for {formatDistanceToNow(new Date(job.runAt), { addSuffix: true })}
                        </span>
                      )}
                      <span className="ml-2">
                        • {job.attempts}/{job.maxAttempts} attempts
                      </span>
                    </div>

                    {job.lastError && (
                      <p className="mt-1 text-xs text-red-600 truncate">
                        {job.lastError}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : job.id) }}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {/* Action buttons */}
                    <div className="flex items-center space-x-1">
                      {status === 'failed' && (
                        <button
                          onClick={(e) => handleRetryJob(job.id, e)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Retry job"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      {(status === 'pending' || status === 'running') && (
                        <button
                          onClick={(e) => handleCancelJob(job.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Cancel job"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {status === 'pending' && (
                        <button
                          onClick={(e) => handleCompleteJob(job.id, e)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Mark as complete"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 bg-white rounded border border-blue-100 p-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-500 mb-1">Job Info</div>
                        <div className="space-y-1 text-gray-800">
                          <div><span className="text-gray-500">ID:</span> {job.id}</div>
                          <div><span className="text-gray-500">Priority:</span> {job.priority}</div>
                          <div><span className="text-gray-500">Locked By:</span> {job.lockedBy || '—'}</div>
                          <div><span className="text-gray-500">Locked At:</span> {job.lockedAt ? new Date(job.lockedAt).toLocaleString() : '—'}</div>
                          <div><span className="text-gray-500">Run At:</span> {job.runAt ? new Date(job.runAt).toLocaleString() : '—'}</div>
                          <div><span className="text-gray-500">Updated:</span> {new Date(job.updatedAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Attempts</div>
                        <div className="space-y-1 text-gray-800">
                          <div><span className="text-gray-500">Attempts:</span> {job.attempts}</div>
                          <div><span className="text-gray-500">Max Attempts:</span> {job.maxAttempts}</div>
                          {job.lastError && (
                            <div className="mt-2">
                              <div className="text-gray-500 mb-1">Last Error</div>
                              <pre className="whitespace-pre-wrap break-words bg-red-50 border border-red-100 text-red-700 p-2 rounded max-h-56 overflow-auto">{job.lastError}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {job._privateJobById?.payload && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-gray-500">Payload</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(job._privateJobById.payload, null, 2)) }}
                            className="inline-flex items-center px-2 py-1 border border-gray-200 text-xs leading-4 font-medium rounded-md text-gray-700 hover:bg-gray-50"
                            title="Copy payload"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 p-3 rounded max-h-64 overflow-auto">{JSON.stringify(job._privateJobById.payload, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Pagination Controls */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={(p) => setCurrentPage(p)}
        />
      )}
    </div>
  )
}

export default JobList
