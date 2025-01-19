import { BookOpenCheckIcon } from "lucide-react";
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
import jwt from "jsonwebtoken";
import { getSession } from "@/lib/server/auth";
import { toast } from "@/hooks/use-toast";

const signupSchema = z.object({
  name: z.string()
    .max(48, "Name must not exceed 48 characters")
    .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must not exceed 32 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    
    try {
      await axios.post("/api/auth/signup", data);

      toast({
        title: "✅ Success, verify your email",
        description: "We've sent you an email to verify your account. Please check your inbox and click the link to verify your account.",
        variant: "default",
        duration: 10000
      });

      router.push("/auth/login");
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
        <a href="/" className="flex items-center self-center font-semibold">
          <BookOpenCheckIcon className="size-5" />
          Prepity
        </a>
        <div className={cn("flex flex-col gap-6")}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">
                Create an account
              </CardTitle>
              <CardDescription>
                Join us and start learning today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onChange={handleFormChange} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      {...form.register("name")}
                      aria-invalid={!!form.formState.errors.name}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
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
                    {loading ? "Creating account..." : "Sign up"}
                  </Button>
                </div>
              </form>
              <hr className="my-5" />
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="px-0 h-7"
                  type="button"
                  onClick={() => router.push('/auth/login')}
                >
                  Login
                </Button>
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
