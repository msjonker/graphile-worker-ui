import React from 'react'
import { useParams } from 'react-router-dom'
import JobDetails from './JobDetails'

const JobPage = () => {
  const { id } = useParams()
  const jobId = id ? (isNaN(Number(id)) ? id : Number(id)) : null

  return (
    <div className="max-w-4xl mx-auto">
      <JobDetails jobId={jobId} onRefresh={() => { /* no-op; JobDetails polls */ }} />
    </div>
  )
}

export default JobPage
