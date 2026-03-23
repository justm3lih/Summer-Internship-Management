"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastContext } from "@/components/providers/toast-provider";
import { User as UserIcon, Mail, Camera } from "lucide-react";
import { getMe, getProfile, updateProfile } from "@/lib/api";

const defaultProfile = {
  name: "",
  email: "",
  photo: undefined as string | undefined,
};

/** Company profile page: load profile from API and allow editing name, email, photo */
export default function CompanyProfilePage() {
  const { showToast } = useToastContext();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(defaultProfile);
  const [initialProfileData, setInitialProfileData] = useState(defaultProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const loadProfile = async (id: string) => {
    const apiUser = await getProfile(id);
    if (!apiUser) return;

    const nextProfile = {
      name: apiUser.name,
      email: apiUser.email,
      photo: apiUser.photo,
    };
    setProfileData(nextProfile);
    setInitialProfileData(nextProfile);
  };

  useEffect(() => {
    getMe()
      .then((me) => {
        if (!me?.id) return;
        setUserId(me.id);
        return loadProfile(me.id);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const result = await updateProfile(userId, {
      name: profileData.name,
      email: profileData.email || undefined,
      photo: profileData.photo,
    });
    setSaving(false);
    if (result.success) {
      const nextProfile = {
        name: result.user.name,
        email: result.user.email,
        photo: result.user.photo,
      };
      setProfileData(nextProfile);
      setInitialProfileData(nextProfile);
      showToast("Profile updated.", "success");
      setIsEditing(false);
      setPhotoFile(null);
    } else {
      showToast(result.message, "error");
    }
  };

  const handleCancel = () => {
    setProfileData(initialProfileData);
    setPhotoFile(null);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="View and edit your profile information" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View and edit your company profile"
      >
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="relative group">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                  {profileData.photo ? (
                    <img
                      src={profileData.photo}
                      alt={profileData.name}
                      className="h-32 w-32 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-16 w-16 text-primary" />
                  )}
                </div>
                {isEditing && (
                  <>
                    <label
                      htmlFor="photo-upload"
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPhotoFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileData({
                              ...profileData,
                              photo: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </div>
            {isEditing && photoFile && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{photoFile.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoFile(null);
                    if (userId)
                      getProfile(userId).then(
                        (u) => u && setProfileData((p) => ({ ...p, photo: u.photo }))
                      );
                  }}
                  className="mt-2"
                >
                  Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Company Name
                </Label>
                {isEditing ? (
                  <Input
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

