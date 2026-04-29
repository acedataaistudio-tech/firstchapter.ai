import { CollegeSelector } from '../components/CollegeSelector';
import { useState } from 'react';

// Define the College type
interface College {
  id: string;
  name: string;
  location: string;
  state: string;
  has_subscription: boolean;
}

export default function TestPage() {
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          College Selector Test
        </h1>
        
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <CollegeSelector 
            onSelect={(college) => {
              console.log('✅ College selected:', college);
              setSelectedCollege(college);
            }}
            selectedCollege={selectedCollege}
          />
        </div>
        
        {selectedCollege && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              ✅ Selected College:
            </h2>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedCollege.name}</p>
              <p><strong>Location:</strong> {selectedCollege.location}</p>
              <p><strong>State:</strong> {selectedCollege.state}</p>
              <p>
                <strong>Has Subscription:</strong>{' '}
                {selectedCollege.has_subscription ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}