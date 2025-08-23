import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

// Paginated query for JobList component
const GET_PAGINATED_JOBS_QUERY = gql`
  query GetPaginatedJobs($first: Int, $offset: Int, $orderBy: [JobsOrderBy!], $condition: JobCondition) {
    allJobs(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
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
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
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

const JobList = ({ onJobSelect, selectedJobId }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [taskFilter, setTaskFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(25) // 25 jobs per page

  // Build GraphQL condition based on filters
  const buildCondition = () => {
    const conditions = {}
    if (taskFilter !== 'all') {
      conditions.taskIdentifier = taskFilter
    }
    return Object.keys(conditions).length > 0 ? conditions : undefined
  }

  const { data, loading, error, refetch } = useQuery(GET_PAGINATED_JOBS_QUERY, {
    variables: {
      first: pageSize,
      offset: currentPage * pageSize,
      orderBy: ['CREATED_AT_DESC'],
      condition: buildCondition()
    },
    pollInterval: 5000, // Poll every 5 seconds for updates
  })

  const jobs = data?.allJobs?.nodes || []
  const totalCount = data?.allJobs?.totalCount || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = data?.allJobs?.pageInfo?.hasNextPage
  const hasPreviousPage = data?.allJobs?.pageInfo?.hasPreviousPage

  const [retryJob] = useMutation(RETRY_JOB_MUTATION)
  const [cancelJob] = useMutation(CANCEL_JOB_MUTATION)
  const [completeJob] = useMutation(COMPLETE_JOB_MUTATION)

  // Get unique task identifiers for filter
  const uniqueTasks = [...new Set(jobs.map(job => job.taskIdentifier))].sort()

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.taskIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.queueName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.key?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || getJobStatus(job) === statusFilter
    const matchesTask = taskFilter === 'all' || job.taskIdentifier === taskFilter

    return matchesSearch && matchesStatus && matchesTask
  })

  const getJobStatus = (job) => {
    if (job.lockedAt) return 'running'
    if (job.attempts >= job.maxAttempts && job.lastError) return 'failed'
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </div>

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
            const status = getJobStatus(job)
            const StatusIcon = getStatusIcon(status)
            const isSelected = selectedJobId === job.id

            return (
              <div
                key={job.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => onJobSelect(job.id)}
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
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount.toLocaleString()} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={!hasPreviousPage}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={!hasNextPage}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobList
