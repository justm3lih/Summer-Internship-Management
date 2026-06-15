"use client";

import { useState, useRef, useEffect } from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { User, LogOut, Search, Settings, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

interface NavbarProps {
  /** Logo tıklanınca gidilecek panel kökü */
  brandHref: string;
  userName?: string;
  userRole?: string;
  userProfileLink?: string;   // Profil sayfası yolu (örn. /student/profile)
  userSettingsLink?: string;  // Ayarlar sayfası yolu (örn. /student/settings); sadece student'ta veriliyor
}

/** Üst çubuk: arama, tema, kullanıcı adına tıklanınca açılan dropdown (Settings / Profile) ve çıkış */
export function Navbar({ brandHref, userName, userRole, userProfileLink, userSettingsLink }: NavbarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      setSearchQuery("");
    }
  };

  // Dropdown'dan Settings veya Profile seçilince bu path'e gider
  const handleNav = (path: string) => {
    setProfileOpen(false);
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-2 md:gap-4 px-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <BrandLogo href={brandHref} variant="navbar" className="min-w-0" />
        </div>
        
        {/* Search Bar - Always Visible */}
        <form 
          onSubmit={handleSearch} 
          className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full rounded-full"
            />
          </div>
        </form>

        {/* Mobile Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // In mobile, you could open a search modal or expand search
            const searchInput = document.querySelector('input[type="text"][placeholder="Search..."]') as HTMLInputElement;
            searchInput?.focus();
          }}
          className="md:hidden"
        >
          <Search className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <ThemeToggle />

          {userName && <NotificationBell />}

          {userName && (
            <div className="flex items-center gap-2" ref={dropdownRef}>
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="hidden md:flex items-center gap-2"
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm">{userName}</span>
                  {userRole && (
                    <span className="text-xs text-muted-foreground">
                      ({userRole})
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="md:hidden"
                >
                  <User className="h-5 w-5" />
                </Button>
                <div
                  className={`absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-md border bg-background shadow-lg transition-all duration-200 ease-out ${
                    profileOpen
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 -translate-y-1 scale-95 pointer-events-none"
                  }`}
                >
                  {userSettingsLink && (
                    <button
                      type="button"
                      onClick={() => handleNav(userSettingsLink!)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                  )}
                  {userProfileLink && (
                    <button
                      type="button"
                      onClick={() => handleNav(userProfileLink!)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm"
                    >
                      <UserCircle className="h-4 w-4" />
                      Profile
                    </button>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
