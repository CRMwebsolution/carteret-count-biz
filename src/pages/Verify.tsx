import { useParams } from 'react-router-dom';

export default function Verify() {
  const { id } = useParams();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-3">Verify your business</h1>
      <p className="text-gray-600 mb-6">
        Upload your NC entity ID or proof of ownership. In this demo, verification is informational only.
      </p>
      <p className="mt-8 text-sm text-gray-500">Listing ID: {id}</p>
    </div>
  );
}
