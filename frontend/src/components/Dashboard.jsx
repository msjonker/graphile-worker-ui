import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Clock, CheckCircle2, XCircle, AlertTriangle, Play, TrendingUp, TrendingDown, Zap } from 'lucide-react'

const Dashboard = ({ jobs, loading, onJobSelect, jobStats, recentFailedJobs = [], taskChartData = [] }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="w-12 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        {/* Loading Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Use passed jobStats or calculate from jobs
  const stats = jobStats || {
    total: jobs.length,
    pending: jobs.filter(job => !job.lockedAt && job.attempts < job.maxAttempts).length,
    running: jobs.filter(job => job.lockedAt).length,
    failed: jobs.filter(job => job.attempts >= job.maxAttempts && job.lastError).length,
    completed: jobs.filter(job => job.attempts > 0 && !job.lastError && !job.lockedAt).length,
  }

  // Enhanced stat cards configuration
  const statCards = [
    {
      title: 'Total Jobs',
      value: stats.total,
      icon: Zap,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      change: '-3%',
      trend: 'down'
    },
    {
      title: 'Running',
      value: stats.running,
      icon: Play,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      change: '-15%',
      trend: 'down'
    }
  ]

  // Use aggregated taskChartData if provided; fallback to recent jobs grouping
  const chartData = React.useMemo(() => {
    if (taskChartData && taskChartData.length > 0) return taskChartData
    const taskStats = jobs.reduce((acc, job) => {
      const task = job.taskIdentifier || 'Unknown'
      if (!acc[task]) {
        acc[task] = { name: task, total: 0 }
      }
      acc[task].total++
      return acc
    }, {})
    return Object.values(taskStats).slice(0, 8)
  }, [taskChartData, jobs])

  // Status distribution for pie chart
  const statusData = [
    { name: 'Pending', value: stats.pending, color: '#F59E0B' },
    { name: 'Running', value: stats.running, color: '#10B981' },
    { name: 'Completed', value: stats.completed, color: '#3B82F6' },
    { name: 'Failed', value: stats.failed, color: '#EF4444' }
  ].filter(item => item.value > 0)

  // Use the pre-filtered recent failed jobs from the optimized query
  // This is now passed as a prop from the pg-aggregates optimized query

  return (
    <div className="space-y-6">
      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          const TrendIcon = card.trend === 'up' ? TrendingUp : TrendingDown
          return (
            <div key={index} className={`${card.bgColor} rounded-xl border border-gray-100 p-6 transition-all hover:shadow-lg hover:scale-105`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-2 rounded-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendIcon className="h-4 w-4 mr-1" />
                  {card.change}
                </div>
              </div>
              <div className={`text-3xl font-bold ${card.textColor} mb-1`}>
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">{card.title}</div>
            </div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Jobs by Task</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickMargin={12}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Status Distribution</h3>
            <div className="text-sm text-gray-500">Current</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {statusData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Failures */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Failures</h3>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="space-y-3">
            {recentFailedJobs.length > 0 ? (
              recentFailedJobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => onJobSelect(job.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-red-900 truncate">
                      {job.taskIdentifier || 'Unknown Task'}
                    </div>
                    <div className="text-xs text-red-600">
                      #{job.id}
                    </div>
                  </div>
                  <div className="text-xs text-red-600 mt-1 truncate">
                    {job.lastError?.substring(0, 60)}...
                  </div>
                  <div className="text-xs text-red-500 mt-1">
                    {new Date(job.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-500">No recent failures</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
