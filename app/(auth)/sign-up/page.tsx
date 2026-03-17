import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { auth } from "@/auth";
import SignUpForm from "./sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up",
};

const SignUpPage = async (props: {
  searchParams: Promise<{
    callbackUrl: string;
  }>;
}) => {
  const { callbackUrl } = await props.searchParams;

  const session = await auth();

  if (session) {
    return redirect(callbackUrl || "/");
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="space-y-4 p-6">
          <div className="space-y-2 text-center">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold text-blue-600">
                {APP_NAME}
              </span>
            </Link>
            <h1 className="text-xl font-semibold">Create Account</h1>
            <p className="text-sm text-gray-500">
              Enter your information below to sign up
            </p>
          </div>
          <SignUpForm />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
