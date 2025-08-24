import React from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import JobList from './components/JobList'
import Queues from './components/Queues'
import Dashboard from './components/Dashboard'
import JobPage from './components/JobPage'
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

// Dashboard query - optimized with server-side filtering (connection filter plugin)
const GET_DASHBOARD_DATA_QUERY = gql`
  query GetDashboardData {
    total: allJobs {
      totalCount
    }
    running: allJobs(filter: { lockedAt: { isNull: false } }) {
      totalCount
    }
    failed: allJobs(filter: { lastError: { isNull: false }, lockedAt: { isNull: true } }) {
      totalCount
    }
    completed: allJobs(
      filter: { attempts: { greaterThan: 0 }, lastError: { isNull: true }, lockedAt: { isNull: true } }
    ) {
      totalCount
    }
    failedJobs: allJobs(first: 25, orderBy: [UPDATED_AT_DESC], filter: { lastError: { isNull: false } }) {
      nodes {
        id
        taskIdentifier
        lastError
        updatedAt
      }
    }
    taskGroups: allJobs {
      groupedAggregates(groupBy: TASK_IDENTIFIER) {
        keys
        distinctCount { id }
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
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  // Use optimized dashboard query with pg-aggregates
  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_DATA_QUERY, {
    pollInterval: 30000, // Poll every 5 seconds for updates
    errorPolicy: 'all', // Continue if some parts fail
  })

  const navigation = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: BarChart3, description: 'Overview & Stats' },
    { id: 'jobs', path: '/jobs', label: 'Jobs', icon: List, description: 'Browse & Manage' },
    { id: 'queues', path: '/queues', label: 'Queues', icon: Clock, description: 'Queue Status' },
    { id: 'activity', path: '/activity', label: 'Activity', icon: Activity, description: 'Recent Events' },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings, description: 'Configuration' },
  ]

  const handleJobSelect = (id) => {
    if (id) navigate(`/jobs/${id}`)
    else navigate('/jobs')
  }

  // Use optimized counts (pending derived to avoid column-to-column comparison)
  const counts = {
    total: data?.total?.totalCount ?? 0,
    running: data?.running?.totalCount ?? 0,
    failed: data?.failed?.totalCount ?? 0,
    completed: data?.completed?.totalCount ?? 0,
  }
  const jobStats = {
    ...counts,
    pending: Math.max(0, (counts.total || 0) - (counts.running || 0) - (counts.failed || 0) - (counts.completed || 0)),
  }
  
  // Recent failed jobs from server-side filtered query
  const recentFailedJobs = data?.failedJobs?.nodes || []

  // Task chart data from aggregates across all jobs
  const taskChartData = React.useMemo(() => {
    const groups = data?.taskGroups?.groupedAggregates || []
    const items = groups.map(g => {
      const name = String((g.keys && g.keys[0]) ?? 'Unknown')
      const total = Number(g.distinctCount?.id ?? 0)
      return { name, total }
    })
    // sort desc and take top 8 for readability
    return items.sort((a, b) => b.total - a.total).slice(0, 8)
  }, [data])

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
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-3 h-5 w-5`} />
                  <div className="text-left">
                    <div>{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </NavLink>
              )}
            )}
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

          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  loading={loading}
                  onJobSelect={handleJobSelect}
                  jobStats={jobStats}
                  recentFailedJobs={recentFailedJobs}
                  taskChartData={taskChartData}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  loading={loading}
                  onJobSelect={handleJobSelect}
                  jobStats={jobStats}
                  recentFailedJobs={recentFailedJobs}
                  taskChartData={taskChartData}
                />
              }
            />
            <Route path="/jobs" element={<JobList />} />
            <Route path="/jobs/:id" element={<JobPage />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/activity" element={(
              <div className="text-center py-16">
                <Activity className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Activity Log</h3>
                <p className="mt-2 text-gray-500">Real-time activity monitoring coming soon...</p>
              </div>
            )} />
            <Route path="/settings" element={(
              <div className="text-center py-16">
                <Settings className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Settings</h3>
                <p className="mt-2 text-gray-500">Configuration options coming soon...</p>
              </div>
            )} />
          </Routes>
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
