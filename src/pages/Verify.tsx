import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, hardAuthUpload, safeFilename } from '../lib/supabase';

export default function Verify() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('You must be signed in to verify a business.');
      setLoading(false);
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to upload.');
      setLoading(false);
      return;
    }

    if (!id) {
      setError('Listing ID is missing.');
      setLoading(false);
      return;
    }

    try {
      const filename = safeFilename(selectedFile.name);
      const storagePath = `verifications/${id}/${crypto.randomUUID()}-${filename}`;

      // Upload file to Supabase Storage
      await hardAuthUpload('verification-docs', storagePath, selectedFile);

      // Insert verification record into the database
      const { error: dbError } = await supabase.from('verifications').insert({
        listing_id: id,
        requester_id: user.id,
        documents: [storagePath], // Store as a JSON array of paths
        status: 'submitted', // Default status
        entity_type: 'proof_of_ownership', // Example type, could be dynamic
      });

      if (dbError) {
        throw dbError;
      }

      setSuccess('Verification document uploaded successfully! We will review it shortly.');
      setSelectedFile(null); // Clear the selected file
    } catch (err: any) {
      console.error('Verification submission error:', err);
      setError(err.message || 'Something went wrong during verification.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-12">
      <h1 className="text-xl md:text-2xl font-bold mb-3">Verify your business</h1>
      <p className="text-gray-600 mb-6">
        Upload your NC entity ID or proof of ownership to verify your business listing.
      </p>

      {!user && (
        <div className="mb-4 rounded-xl border bg-amber-50 text-amber-800 p-3 text-sm">
          You must be signed in to upload verification documents.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="verification-file" className="block text-sm font-medium text-gray-700 mb-1">
            Upload Document (PDF, JPG, PNG)
          </label>
          <input
            type="file"
            id="verification-file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full text-base"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            disabled={loading || !user}
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted formats: PDF, JPG, PNG. Maximum file size: 10MB.
          </p>
        </div>

        <div>
          <label htmlFor="entity-type" className="block text-sm font-medium text-gray-700 mb-1">
            Document Type
          </label>
          <select
            id="entity-type"
            className="w-full rounded-xl border px-4 py-3 text-base"
            disabled={loading || !user}
          >
            <option value="proof_of_ownership">Proof of Ownership</option>
            <option value="nc_entity_id">NC Entity ID</option>
            <option value="business_license">Business License</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            id="notes"
            placeholder="Any additional information about your verification..."
            className="w-full rounded-xl border px-4 py-3 min-h-20 text-base resize-y"
            disabled={loading || !user}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !user || !selectedFile}
          className="w-full sm:w-auto rounded-xl bg-brand text-white px-5 py-3 hover:bg-brand-dark disabled:opacity-50 text-base font-medium"
        >
          {loading ? 'Uploading...' : 'Submit for Verification'}
        </button>
      </form>

      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Your document will be reviewed by our team</li>
          <li>• Verification typically takes 1-3 business days</li>
          <li>• You'll receive an email notification once reviewed</li>
          <li>• Verified businesses get a "Verified" badge on their listing</li>
        </ul>
      </div>

      <p className="mt-6 text-sm text-gray-500 break-all">Listing ID: {id}</p>
    </div>
  );
}