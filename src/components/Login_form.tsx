"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/CustomButton";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        // ensure the browser will accept HttpOnly Set-Cookie from the response
        credentials: 'same-origin',
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Login failed" }));
        setError(msg || "Login failed");
        return;
      }

      setMessage("Login successful — redirecting...");
      setTimeout(() => router.push("/main"), 800);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col  items-center justify-center bg-corporate font-raleway text-cream">
      <div className=" flex flex-col items-center mb-6">
        <Image src="/logoMain.svg" alt="AlgebraX Logo" width={256} height={256} />
        <div className="text-center mb-8 px-2">
          <h1 className="text-3xl md:text-4xl my-4">DocuSketch demo</h1>
          <p className="text-lg md:text-xl">Enter the demo password 👇</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="max-w-md w-full p-6 bg-white rounded-2xl shadow-lg corporate-overlay ">
        <h2 className="text-2xl font-bold mb-4 text-center text-black text-cream">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="mb-4">{message}</p>}
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
        <Button text="Enter" type="submit" size="md" onClick={undefined} disabled={false} />
      </form>
    </div>
  );
}
