import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="pt-10">
      <EmptyState icon={Compass} title="Page not found" message="That route doesn't exist." />
      <div className="text-center">
        <Link to="/" className="text-sm text-primary hover:underline">Back to overview</Link>
      </div>
    </div>
  );
}
