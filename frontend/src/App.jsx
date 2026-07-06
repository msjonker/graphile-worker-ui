import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Queues from './pages/Queues';
import Workers from './pages/Workers';
import Tasks from './pages/Tasks';
import Schedules from './pages/Schedules';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/queues" element={<Queues />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
