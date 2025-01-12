import { BookOpenCheckIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import jwt from "jsonwebtoken";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/router";
import { cn } from "@/lib/client/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true);
    
    try {
      await axios.post("/api/auth/forgot-password", data);
      setEmailSent(true);
    } catch (err: any) {
      form.setError("root", { 
        message: err.response?.data?.message || "Something went wrong"
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear root error when form is edited
  const handleFormChange = () => {
    if (form.formState.errors.root) {
      form.clearErrors("root");
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center self-center font-semibold">
          <BookOpenCheckIcon className="size-5" />
          Prepity
        </a>
        <div className={cn("flex flex-col gap-6")}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">
                Reset your password
              </CardTitle>
              <CardDescription>
                Enter email to receive a reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    If an account exists with that email, we've sent you instructions to reset your password.
                  </p>
                  <Button
                    variant="link"
                    className="px-0 h-7"
                    type="button"
                    onClick={() => router.push('/auth/login')}
                  >
                    Return to login
                  </Button>
                </div>
              ) : (
                <>
                  <form onChange={handleFormChange} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          placeholder="Enter your email address"
                          {...form.register("email")}
                          aria-invalid={!!form.formState.errors.email}
                        />
                        {form.formState.errors.email && (
                          <p className="text-xs text-red-500">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      {form.formState.errors.root && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.root.message}
                        </p>
                      )}
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loading || form.formState.isSubmitting}
                      >
                        {loading ? "Sending..." : "Send reset link"}
                      </Button>
                    </div>
                  </form>
                  <hr className="my-5" />
                  <div className="text-center text-sm">
                    Remember your password?{" "}
                    <Button
                      variant="link"
                      className="px-0 h-7"
                      type="button"
                      onClick={() => router.push('/auth/login')}
                    >
                      Login
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: any) {
  const token = context.req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    } catch (err) {
      // Clear invalid token
      context.res.setHeader(
        'Set-Cookie',
        'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      );
    }
  }

  return {
    props: {},
  };
} 