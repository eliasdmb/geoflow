'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '../../contexts/AuthContext';

const ProtectedPage = () => {
  const { session, user } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push('/login'); // Redirect to login if no session
    }
  }, [session, router]);

  if (!session) {
    return <p>Redirecting to login...</p>;
  }

  return (
    <div>
      <h1>Protected Content</h1>
      <p>Welcome, {user?.email}!</p>
      <p>This page is only accessible to authenticated users.</p>
    </div>
  );
};

export default ProtectedPage;
