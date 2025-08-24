import React from 'react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { RefreshCw, Layers, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const GET_QUEUES_QUERY = gql`
  query GetQueues {
    allJobs {
      groupedAggregates(groupBy: QUEUE_NAME) {
        keys
        distinctCount { id }
      }
      totalCount
    }
  }
`

const Queues = () => {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useQuery(GET_QUEUES_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  })

  const groups = data?.allJobs?.groupedAggregates || []
  const queues = groups
    .map(g => ({ name: String((g.keys && g.keys[0]) ?? 'default'), total: Number(g?.distinctCount?.id ?? 0) }))
    .sort((a, b) => b.total - a.total)

  if (loading && queues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded mb-2 animate-pulse"></div>
        ))}
      </div>
    )
  }

/*  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Queues</h2>
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
  }*/

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-medium text-gray-900">Queues</h2>
          <span className="text-sm text-gray-500">{queues.length} total</span>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      <div className="divide-y divide-gray-200">
        {queues.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-600">No queues found.</div>
        ) : (
          queues.map((q) => (
            <div
              key={q.name}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
              onClick={() => navigate(`/jobs?q=${encodeURIComponent(q.name)}`)}
              title={`View jobs in ${q.name}`}
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{q.name || 'default'}</div>
                <div className="text-xs text-gray-500 flex items-center mt-1">
                  <Search className="h-3 w-3 mr-1" /> Click to view jobs
                </div>
              </div>
              <div className="text-sm text-gray-700">
                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-800">
                  {q.total.toLocaleString()} jobs
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Queues
