import jwt from "jsonwebtoken";
import { BookOpenCheckIcon } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/router";
import { cn } from "@/lib/client/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/atoms/logo";
import { getSession } from "@/lib/server/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    
    try {
      await axios.post("/api/auth/login", data);
      router.replace("/");
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Logo className="self-center" />
        <div className={cn("flex flex-col gap-6")}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">
                Hey champ, let's login.
              </CardTitle>
              <CardDescription>
                Let's start learning today.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      {...form.register("password")}
                      aria-invalid={!!form.formState.errors.password}
                    />
                    {form.formState.errors.password && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.password.message}
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
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </div>
              </form>
              <hr className="my-5" />
              <div>
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="px-0 h-7"
                  type="button"
                  onClick={() => router.push('/auth/signup')}
                >
                  Sign up
                </Button>
              </div>
              <div className="text-center text-sm">
                Forgot your password?{" "}
                <Button
                  variant="link"
                  className="px-0 h-7"
                  type="button"
                  onClick={() => router.push('/auth/reset-password')}
                >
                  Reset password
                </Button>
              </div>
              </div>
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
      const session = await getSession(context.req);
      if (session) {
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      } else {
        throw new Error("User session invalid");
      }
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