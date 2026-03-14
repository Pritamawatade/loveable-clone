"use client"
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

import { useMutation } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default  function Home() {

  const [value, setValue] = React.useState("");
  const trpc = useTRPC();

  const invoke = useMutation(trpc.invoke.mutationOptions({
    onSuccess: () =>{
      toast.success("AI made call")
    },
    onError: (err) => {
      toast.error("AI call failed: " + err.message)
    }
  }))

  return (
<div>
  <Input type="text" onChange={(e) => setValue(e.target.value)} value={value} />
  <Button onClick={() => invoke.mutate({value: value})}>Call AI</Button>
</div>

  );
}
