"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToastContext } from "@/components/providers/toast-provider";
import { User, Mail, GraduationCap, Calendar, Camera } from "lucide-react";
import Image from "next/image";
import { getMe, getProfile, updateProfile } from "@/lib/api";
import { fetchStudentDepartments } from "@/lib/departments";

// Form için varsayılan profil alanları
const defaultProfile = {
  name: "",
  email: "",
  studentId: "",
  department: "",
  currentSemester: 7,
  cgpa: "",
  homeAddress: "",
  homeTelephone: "",
  mobileTelephone: "",
  addressNorthCyprus: "",
  photo: undefined as string | undefined,
};

/** Öğrenci profil sayfası: API'den profil çeker, düzenleyip PATCH ile kaydeder; fotoğraf base64 olarak saklanır */
export default function ProfilePage() {
  const { showToast } = useToastContext();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(defaultProfile);
  const [initialProfileData, setInitialProfileData] = useState(defaultProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [deptList, setDeptList] = useState<string[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);

  const loadProfile = async (id: string) => {
    const apiUser = await getProfile(id);
    if (!apiUser) return;

    setDeptLoading(true);
    const depts = await fetchStudentDepartments(apiUser.department);
    setDeptList(depts);
    setDeptLoading(false);

    const nextProfile = {
      name: apiUser.name,
      email: apiUser.email,
      studentId: apiUser.studentId || "",
      department: apiUser.department || "",
      currentSemester: apiUser.currentSemester ?? 7,
      cgpa: apiUser.cgpa != null ? String(apiUser.cgpa) : "",
      homeAddress: apiUser.homeAddress || "",
      homeTelephone: apiUser.homeTelephone || "",
      mobileTelephone: apiUser.mobileTelephone || "",
      addressNorthCyprus: apiUser.addressNorthCyprus || "",
      photo: apiUser.photo,
    };
    setProfileData(nextProfile);
    setInitialProfileData(nextProfile);
  };

  // Sayfa açıldığında localStorage'dan sadece user id al, profilin tamamını API'den getir
  useEffect(() => {
    getMe()
      .then((me) => {
        if (!me?.id) return;
        setUserId(me.id);
        return loadProfile(me.id);
      })
      .finally(() => setLoading(false));
  }, []);

  // Kaydet: updateProfile API ile PATCH atar, başarılıysa ekrandaki temel veriyi günceller
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const payload: Parameters<typeof updateProfile>[1] = {
      name: profileData.name,
      email: profileData.email || undefined,
      studentId: profileData.studentId || undefined,
      department: profileData.department || undefined,
      currentSemester: profileData.currentSemester,
      homeAddress: profileData.homeAddress.trim() || null,
      homeTelephone: profileData.homeTelephone.trim() || null,
      mobileTelephone: profileData.mobileTelephone.trim() || null,
      addressNorthCyprus: profileData.addressNorthCyprus.trim() || null,
      photo: profileData.photo,
    };
    const cgpaParsed = parseFloat(profileData.cgpa.trim().replace(",", "."));
    if (profileData.cgpa.trim() !== "" && !Number.isNaN(cgpaParsed)) {
      payload.cgpa = cgpaParsed;
    }

    const result = await updateProfile(userId, payload);
    setSaving(false);
    if (result.success) {
      const depts = await fetchStudentDepartments(result.user.department);
      setDeptList(depts);
      const nextProfile = {
        name: result.user.name,
        email: result.user.email,
        studentId: result.user.studentId || "",
        department: result.user.department || "",
        currentSemester: result.user.currentSemester ?? 7,
        cgpa: result.user.cgpa != null ? String(result.user.cgpa) : "",
        homeAddress: result.user.homeAddress || "",
        homeTelephone: result.user.homeTelephone || "",
        mobileTelephone: result.user.mobileTelephone || "",
        addressNorthCyprus: result.user.addressNorthCyprus || "",
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

  // İptal: düzenlemeyi kapat, API'den gelen son profile geri dön
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
        description="View and edit your profile information"
      >
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
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
                    <Image
                      src={profileData.photo}
                      alt={profileData.name}
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="h-16 w-16 text-primary" />
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
                          // Seçilen dosyayı base64'e çevirip önizleme ve kayıt için kullan
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
                <p className="text-sm text-muted-foreground">
                  {photoFile.name}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoFile(null);
                    if (userId) getProfile(userId).then((u) => u && setProfileData((p) => ({ ...p, photo: u.photo })));
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
            <CardDescription>Your account details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Student ID
                </Label>
                {isEditing ? (
                  <Input
                    value={profileData.studentId}
                    onChange={(e) =>
                      setProfileData({ ...profileData, studentId: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.studentId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Department
                </Label>
                {isEditing ? (
                  deptLoading ? (
                    <p className="text-sm text-muted-foreground">Loading departments…</p>
                  ) : deptList.length === 0 ? (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No departments are configured yet. Your coordinator must publish the
                      department list in Settings.
                    </p>
                  ) : (
                    <Select
                      value={profileData.department || undefined}
                      onValueChange={(v) => setProfileData({ ...profileData, department: v })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {deptList.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <p className="text-sm font-medium">{profileData.department || "—"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Current Semester
                </Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={profileData.currentSemester}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        currentSemester: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">Semester {profileData.currentSemester}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Contact &amp; logbook export</CardTitle>
            <CardDescription>
              Used on your internship logbook Word export (CGPA, addresses, phone numbers).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>CGPA</Label>
                {isEditing ? (
                  <Input
                    inputMode="decimal"
                    placeholder="e.g. 3.45"
                    value={profileData.cgpa}
                    onChange={(e) =>
                      setProfileData({ ...profileData, cgpa: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {profileData.cgpa.trim() !== "" ? profileData.cgpa : "—"}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-2">
                <Label>Home address</Label>
                {isEditing ? (
                  <Input
                    value={profileData.homeAddress}
                    onChange={(e) =>
                      setProfileData({ ...profileData, homeAddress: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.homeAddress || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Home telephone</Label>
                {isEditing ? (
                  <Input
                    value={profileData.homeTelephone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, homeTelephone: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.homeTelephone || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Mobile telephone</Label>
                {isEditing ? (
                  <Input
                    value={profileData.mobileTelephone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, mobileTelephone: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.mobileTelephone || "—"}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label>Address in North Cyprus</Label>
                {isEditing ? (
                  <Input
                    value={profileData.addressNorthCyprus}
                    onChange={(e) =>
                      setProfileData({ ...profileData, addressNorthCyprus: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.addressNorthCyprus || "—"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
