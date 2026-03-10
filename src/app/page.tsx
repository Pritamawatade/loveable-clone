import { Button } from "@/components/ui/button";
import prisma from "@/lib/db";

export default async function Home() {
  const users = await prisma.user.findMany({});

  return (
   <div>
   {
    JSON.stringify(users, ['name'], 2)
   }
   </div>
  );
}
