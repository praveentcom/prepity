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

const newPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must not exceed 32 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

export default function NewPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { token } = router.query;

  const form = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: NewPasswordFormValues) => {
    setLoading(true);
    
    try {
      await axios.post("/api/auth/reset-password", {
        password: data.password,
        token: token,
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

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">
              Invalid or expired reset link. Please request a new password reset.
            </p>
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => router.push('/auth/reset-password')}
              >
                Request new reset link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                Set new password
              </CardTitle>
              <CardDescription>
                Please enter your new password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onChange={handleFormChange} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your new password"
                      {...form.register("password")}
                      aria-invalid={!!form.formState.errors.password}
                    />
                    {form.formState.errors.password && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      {...form.register("confirmPassword")}
                      aria-invalid={!!form.formState.errors.confirmPassword}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.confirmPassword.message}
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
                    {loading ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
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