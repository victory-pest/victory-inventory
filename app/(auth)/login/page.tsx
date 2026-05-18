"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await signIn("credentials", {
      identifier: identifier.trim(),
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (!res || res.error) {
      setError("Invalid credentials. Please try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-bg">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/Victory_logo.png"
              alt="Victory Pest Solutions"
              width={180}
              height={180}
              priority
              className="h-auto w-44"
            />
          </div>

          <h1 className="text-2xl font-heading font-semibold text-center text-brand-dark mb-1">
            Sign In
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Inventory access for Victory Pest Solutions
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or Username</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="you@company.com or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-brand-error" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-brand-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgot your password?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              For security reasons, passwords cannot be reset automatically.
            </p>
            <p>
              Please contact the <span className="font-semibold">main office</span> to recover your credentials.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowForgotModal(false)}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
