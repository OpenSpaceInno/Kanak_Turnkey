import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Admin() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/settings?tab=users");
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
      Redirecting to User Management & Administration...
    </div>
  );
}
