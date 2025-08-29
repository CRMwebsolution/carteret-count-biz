// Admin email configuration
// Add email addresses here to grant admin access
export const ADMIN_EMAILS = [
  'admin@carteretlocal.com',
  'your.email@example.com', // Replace with your actual admin email
  // Add more admin emails as needed
]

// Helper function to check if an email has admin privileges
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}