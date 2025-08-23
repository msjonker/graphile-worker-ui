import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import JobList from './components/JobList'
import JobDetails from './components/JobDetails'
import Dashboard from './components/Dashboard'
import { 
  Activity, 
  List, 
  BarChart3, 
  Settings, 
  Zap, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Menu,
  X
} from 'lucide-react'

// Dashboard query - fetch all jobs for accurate stats
const GET_DASHBOARD_DATA_QUERY = gql`
  query GetDashboardData {
    allJobs {
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
        lockedAt
        lockedBy
      }
    }
  }
`

// Fallback query for when pg-aggregates is not available
const GET_JOBS_QUERY = gql`
  query GetJobs($first: Int, $offset: Int, $orderBy: [JobsOrderBy!]) {
    allJobs(first: $first, offset: $offset, orderBy: $orderBy) {
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Use optimized dashboard query with pg-aggregates
  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_DATA_QUERY, {
    pollInterval: 5000, // Poll every 5 seconds for updates
    errorPolicy: 'all', // Continue if some parts fail
  })

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Overview & Stats' },
    { id: 'jobs', label: 'Jobs', icon: List, description: 'Browse & Manage' },
    { id: 'queues', label: 'Queues', icon: Clock, description: 'Queue Status' },
    { id: 'activity', label: 'Activity', icon: Activity, description: 'Recent Events' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Configuration' },
  ]

  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId)
    setActiveTab('jobs')
  }

  // Calculate job stats from ALL jobs (like it was working before)
  const jobs = data?.allJobs?.nodes || []
  const jobStats = {
    total: jobs.length,
    pending: jobs.filter(job => !job.lockedAt && job.attempts < job.maxAttempts).length,
    running: jobs.filter(job => job.lockedAt).length,
    failed: jobs.filter(job => job.lastError && !job.lockedAt).length,
    completed: jobs.filter(job => job.attempts > 0 && !job.lastError && !job.lockedAt).length,
  }
  
  // Recent failed jobs for Dashboard
  const recentFailedJobs = jobs
    .filter(job => job.lastError)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-white" />
              <span className="ml-2 text-xl font-bold text-white">Graphile Worker</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Pending: {jobStats.pending}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Running: {jobStats.running}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Done: {jobStats.completed}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Failed: {jobStats.failed}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <div className="text-left">
                    <div>{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className={`flex items-center text-xs ${
                error ? 'text-red-600' : 'text-green-600'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  error ? 'bg-red-500' : 'bg-green-500'
                }`}></div>
                {error ? 'Disconnected' : 'Connected'}
              </div>
              <button
                onClick={() => refetch()}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Graphile Worker</h1>
            <div className={`w-3 h-3 rounded-full ${
              error ? 'bg-red-500' : 'bg-green-500'
            }`}></div>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Connection Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error.message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              jobs={jobs} 
              loading={loading}
              onJobSelect={handleJobSelect}
              jobStats={jobStats}
              recentFailedJobs={recentFailedJobs}
            />
          )}

          {activeTab === 'jobs' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3">
                <JobList 
                  onJobSelect={setSelectedJobId}
                  selectedJobId={selectedJobId}
                />
              </div>
              <div className="xl:col-span-1">
                {selectedJobId && (
                  <JobDetails 
                    jobId={selectedJobId}
                    onRefresh={refetch}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'queues' && (
            <div className="text-center py-16">
              <Clock className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Queue Management</h3>
              <p className="mt-2 text-gray-500">
                Queue monitoring and management features coming soon...
              </p>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-16">
              <Activity className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Activity Log</h3>
              <p className="mt-2 text-gray-500">
                Real-time activity monitoring coming soon...
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="text-center py-16">
              <Settings className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Settings</h3>
              <p className="mt-2 text-gray-500">
                Configuration options coming soon...
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => setSidebarOpen(false)}
          ></div>
        </div>
      )}
    </div>
  )
}

export default App
