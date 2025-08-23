import React from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'
import { 
  Clock, 
  User, 
  Calendar, 
  Hash, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  RotateCcw, 
  X,
  Copy,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

const GET_JOB_QUERY = gql`
  query GetJob($id: BigInt!) {
    allJobs(condition: { id: $id }) {
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

const JobDetails = ({ jobId, onRefresh }) => {
  const { data, loading, error } = useQuery(GET_JOB_QUERY, {
    variables: { id: jobId },
    skip: !jobId,
    pollInterval: 2000, // Poll every 2 seconds for real-time updates
  })

  const [retryJob] = useMutation(RETRY_JOB_MUTATION)
  const [cancelJob] = useMutation(CANCEL_JOB_MUTATION)
  const [completeJob] = useMutation(COMPLETE_JOB_MUTATION)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading job</h3>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  const job = data?.allJobs?.nodes?.[0]
  
  if (!job) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <Hash className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Job not found</h3>
          <p className="mt-1 text-sm text-gray-500">The selected job could not be found.</p>
        </div>
      </div>
    )
  }

  // job is already defined above

  const getJobStatus = (job) => {
    if (job.lockedAt) return 'running'
    if (job.attempts >= job.maxAttempts && job.lastError) return 'failed'
    if (job.attempts > 0 && !job.lastError && !job.lockedAt) return 'completed'
    return 'pending'
  }

  const status = getJobStatus(job)

  const handleRetryJob = async () => {
    try {
      await retryJob({ variables: { jobId: job.id } })
      toast.success('Job retry scheduled')
      onRefresh()
    } catch (error) {
      toast.error(`Failed to retry job: ${error.message}`)
    }
  }

  const handleCancelJob = async () => {
    if (!confirm('Are you sure you want to cancel this job?')) return
    
    try {
      await cancelJob({ variables: { jobId: job.id } })
      toast.success('Job cancelled')
      onRefresh()
    } catch (error) {
      toast.error(`Failed to cancel job: ${error.message}`)
    }
  }

  const handleCompleteJob = async () => {
    if (!confirm('Are you sure you want to mark this job as complete?')) return
    
    try {
      await completeJob({ variables: { jobId: job.id } })
      toast.success('Job marked as complete')
      onRefresh()
    } catch (error) {
      toast.error(`Failed to complete job: ${error.message}`)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const DetailRow = ({ label, value, icon: Icon, copyable = false }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center text-sm text-gray-500">
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {label}
      </div>
      <div className="flex items-center">
        <span className="text-sm text-gray-900 font-medium">{value}</span>
        {copyable && (
          <button
            onClick={() => copyToClipboard(value)}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Job Details</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="px-6 py-4 space-y-1">
        <DetailRow 
          label="Job ID" 
          value={job.id} 
          icon={Hash} 
          copyable 
        />
        
        <DetailRow 
          label="Task" 
          value={job.taskIdentifier} 
          icon={Play} 
          copyable 
        />
        
        {job.queueName && (
          <DetailRow 
            label="Queue" 
            value={job.queueName} 
            copyable 
          />
        )}
        
        {job.key && (
          <DetailRow 
            label="Key" 
            value={job.key} 
            copyable 
          />
        )}
        
        <DetailRow 
          label="Priority" 
          value={job.priority} 
        />
        
        <DetailRow 
          label="Attempts" 
          value={`${job.attempts} / ${job.maxAttempts}`} 
        />
        
        <DetailRow 
          label="Created" 
          value={formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })} 
          icon={Calendar} 
        />
        
        <DetailRow 
          label="Updated" 
          value={formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })} 
          icon={Clock} 
        />
        
        {job.runAt && (
          <DetailRow 
            label="Run At" 
            value={new Date(job.runAt).toLocaleString()} 
            icon={Calendar} 
          />
        )}
        
        {job.lockedAt && (
          <DetailRow 
            label="Locked At" 
            value={formatDistanceToNow(new Date(job.lockedAt), { addSuffix: true })} 
          />
        )}
        
        {job.lockedBy && (
          <DetailRow 
            label="Locked By" 
            value={job.lockedBy} 
            icon={User} 
            copyable 
          />
        )}
        
        <DetailRow 
          label="Revision" 
          value={job.revision} 
        />
        
        {job.flags && Object.keys(job.flags).length > 0 && (
          <div className="py-2">
            <div className="text-sm text-gray-500 mb-2">Flags</div>
            <div className="flex flex-wrap gap-1">
              {Object.keys(job.flags).map(flag => (
                <span key={flag} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Details */}
      {job.lastError && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-sm font-medium text-gray-900">Last Error</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
              {job.lastError}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex space-x-3">
          {status === 'failed' && (
            <button
              onClick={handleRetryJob}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry
            </button>
          )}
          
          {(status === 'pending' || status === 'running') && (
            <button
              onClick={handleCancelJob}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
          )}

          {status === 'pending' && (
            <button
              onClick={handleCompleteJob}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobDetails
