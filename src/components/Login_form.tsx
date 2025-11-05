"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/supabaseClient";
import Image from "next/image";
import Button from "@/components/ui/CustomButton";

export default function LoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setMessage(null);
    } else {
      setMessage("Login successful! Redirecting to app...");
      setError(null);
      setTimeout(() => {
        router.push("/main");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col  items-center justify-center bg-corporate font-raleway text-cream">
      <div className=" flex flex-col items-center mb-6">
        <Image src="/logoMain.svg" alt="AlgebraX Logo" width={256} height={256} />
        <div className="text-center mb-8 px-2">
          <h1 className="text-3xl md:text-4xl my-4">Anyskin admin platform</h1>
          <p className="text-lg md:text-xl">Please enter your account data 👇</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="max-w-md w-full p-6 bg-white rounded-2xl shadow-lg corporate-overlay ">
        <h2 className="text-2xl font-bold mb-4 text-center text-black text-cream">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="mb-4">{message}</p>}
        <div className="mb-4">
          <label htmlFor="login-email" className="block mb-2 font-medium text-cream">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border bg-gray-100 border-gray-300 rounded-2xl p-2 focus:outline-none focus:ring focus:border-blue-300 text-cream"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="login-password" className="block mb-2 font-medium text-cream">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border bg-gray-100 border-gray-300 rounded-2xl p-2 focus:outline-none focus:ring focus:border-blue-300"
            required
          />
        </div>
        <Button
          text="Enter"
          type="submit" 
          size="md"
          onClick={undefined}
          disabled={false}
        />
      </form>
    </div>
  );
}
