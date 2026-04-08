"use client"
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default  function Home() {

  const [value, setValue] = React.useState("");
  const trpc = useTRPC();
  const router = useRouter();

  const createProject = useMutation(trpc.projects.create.mutationOptions({
    onSuccess: () =>{
      toast.success("AI made call")
      router.push(`/projects/${createProject.data?.id}`)
    },
    onError: (err) => {
      toast.error("AI call failed: " + err.message)
    }
  }))

  return (
<div className="h-screen w-screen flex items-center justify-center">
  <div className="max-w-7xl mx-auto flex items-center flex-col gap-y-4 justify-center ">

  <Input type="text" onChange={(e) => setValue(e.target.value)} value={value} />
  <Button onClick={() => createProject.mutate({value: value})}>Call AI</Button>
  </div>
</div>

  );
}
