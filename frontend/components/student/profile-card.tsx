import { Card, CardContent } from "@/components/ui/card";
import { User } from "@/types";
import { User as UserIcon } from "lucide-react";
import Image from "next/image";

interface ProfileCardProps {
  user: User;
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {user.photo ? (
              <Image
                src={user.photo}
                alt={user.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <UserIcon className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">
              {[user.department, user.currentSemester != null && `Semester ${user.currentSemester}`].filter(Boolean).join(" • ") || "—"}
            </p>
            {user.studentId && <p className="text-xs text-muted-foreground">ID: {user.studentId}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
