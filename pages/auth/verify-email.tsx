import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpenCheckIcon, CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";
import axios from 'axios';
import { cn } from '@/lib/client/utils';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const response = await axios.post('/api/auth/verify-email', { token });
        setStatus('success');
        setMessage('Redirecting...');
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 5000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center self-center font-semibold">
          <BookOpenCheckIcon className="size-5" />
          Prepity
        </a>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Email Verification</CardTitle>
            <CardDescription>
              {status === 'loading' && 'Verifying your email address'}
              {status === 'success' && 'Email Verified Successfully'}
              {status === 'error' && 'Verification Failed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {status === 'success' && (
              <div className="text-green-700">
                <CheckCircle2Icon className="size-6" />
              </div>
            )}
            {status === 'error' && (
              <div className="text-yellow-700">
                <AlertTriangleIcon className="size-6" />
              </div>
            )}
            <p className={cn(
              "text-center",
              status === 'success' && "text-green-700",
              status === 'error' && "text-yellow-700"
            )}>
              {message}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 