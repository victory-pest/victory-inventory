"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "super_admin" | "manager" | "supervisor" | "technician";

export type UserRow = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: Role;
  locationId: string | null;
  locationName: string | null;
  supervisedLocationIds: string[];
  active: boolean;
  licenseIds: string[];
};

type Props = {
  users: UserRow[];
  locations: { id: string; name: string }[];
  licenseTypes: { id: string; name: string }[];
};

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  technician: "Technician",
};

export function UsersTab({ users, locations, licenseTypes }: Props) {
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-medium text-brand-dark">Users ({users.length})</p>
          <Button
            size="sm"
            onClick={() => setEditing("new")}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add user
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-sm text-brand-dark/60">
                    No users yet.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-brand-dark/70 text-xs">
                      {u.email ?? u.username ?? "—"}
                    </TableCell>
                    <TableCell>{roleLabels[u.role]}</TableCell>
                    <TableCell>
                      {u.role === "supervisor"
                        ? u.supervisedLocationIds.length === 0
                          ? "—"
                          : u.supervisedLocationIds
                              .map(
                                (id) =>
                                  locations.find((l) => l.id === id)?.name,
                              )
                              .filter(Boolean)
                              .join(", ")
                        : (u.locationName ?? "—")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.active
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }
                      >
                        {u.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(u)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <UserDialog
          row={editing === "new" ? null : editing}
          locations={locations}
          licenseTypes={licenseTypes}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function UserDialog({
  row,
  locations,
  licenseTypes,
  onClose,
}: {
  row: UserRow | null;
  locations: { id: string; name: string }[];
  licenseTypes: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(row?.name ?? "");
  const [email, setEmail] = useState(row?.email ?? "");
  const [username, setUsername] = useState(row?.username ?? "");
  const [role, setRole] = useState<Role>(row?.role ?? "technician");
  const [locationId, setLocationId] = useState<string>(
    row?.locationId ?? (locations[0]?.id ?? ""),
  );
  const [supervisedLocationIds, setSupervisedLocationIds] = useState<string[]>(
    row?.supervisedLocationIds ?? [],
  );
  const [licenseIds, setLicenseIds] = useState<string[]>(row?.licenseIds ?? []);
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(row?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleSupervisedLocation(id: string) {
    setSupervisedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleLicense(id: string) {
    setLicenseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function save() {
    if (name.trim().length === 0) {
      toast.error("Name required");
      return;
    }
    if (!row && password.trim().length < 6) {
      toast.error("Password required (min 6 chars)");
      return;
    }
    if (role === "technician" && username.trim().length === 0) {
      toast.error("Technicians need a username");
      return;
    }
    if (role !== "technician" && email.trim().length === 0) {
      toast.error("This role requires an email");
      return;
    }
    if (role === "supervisor" && supervisedLocationIds.length === 0) {
      toast.error("Supervisors need at least one location");
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: role === "technician" ? null : (email.trim() || null),
      username: role === "technician" ? (username.trim() || null) : null,
      role,
      locationId: role === "supervisor" ? null : (locationId || null),
      supervisedLocationIds: role === "supervisor" ? supervisedLocationIds : [],
      licenseIds,
      active,
    };
    if (password) payload.password = password;
    const res = row
      ? await fetch(`/api/users/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || "Save failed. Please try again.");
      return;
    }
    toast.success(row ? "User updated" : "User added");
    onClose();
    router.refresh();
  }

  const isTech = role === "technician";

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? "Edit user" : "Add user"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "supervisor" ? (
            <div className="space-y-2">
              <Label>Supervised locations *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-md border p-3">
                {locations.length === 0 ? (
                  <p className="text-xs text-brand-dark/60">
                    No active locations available.
                  </p>
                ) : (
                  locations.map((l) => (
                    <label
                      key={l.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={supervisedLocationIds.includes(l.id)}
                        onChange={() => toggleSupervisedLocation(l.id)}
                      />
                      {l.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select
                value={locationId || "none"}
                onValueChange={(v) => setLocationId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isTech && (
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          {isTech && (
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{row ? "New password (leave blank to keep)" : "Password *"}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isTech && licenseTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Licenses</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {licenseTypes.map((lt) => (
                  <label
                    key={lt.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={licenseIds.includes(lt.id)}
                      onChange={() => toggleLicense(lt.id)}
                    />
                    {lt.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {row && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {errorMessage && (
      <Dialog
        open
        onOpenChange={(o) => !o && setErrorMessage(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Could not save user</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-dark/80 py-2">{errorMessage}</p>
          <DialogFooter>
            <Button
              onClick={() => setErrorMessage(null)}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
