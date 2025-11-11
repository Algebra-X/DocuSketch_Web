"use client";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/CustomButton";
import TooltipIcon from "@/components/ui/TooltipIcon";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start px-6 py-10 bg-corporate font-raleway text-cream">
      {/* Logo section */}
      <div className="mb-10 mt-4">
        <Image src="/logoMain.svg" alt="AlgebraX Logo" width={256} height={256} />
      </div>
      {/* Centered text content */}
      <div className="text-center mb-12 px-2">
        <h1 className="text-3xl md:text-6xl my-4">DocuSketch Demo</h1>
        <p className="text-lg md:text-4xl">Log in 👇</p>
      </div>
      {/* Action buttons */}
      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8 text-cream">
        <Link href="/login">
        <Button
          text="Login"
          size="gg"
          hoverColor="green"
          onClick={undefined}
          disabled={false}
        />
        </Link>
      </div>
      
      <div className="mt-4 flex justify-center">
        <TooltipIcon text="The system is only available to administrators whose accounts are present in the Supabase database.
         To gain access, create an account in the application and ask an administrator to assign you the required role" />
      </div>
    </div>
  );
}
