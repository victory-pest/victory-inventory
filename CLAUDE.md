# CLAUDE.md — Victory Pest Inventory System
## Specification Document for Claude Code v2.0

---

## ⚠️ MANDATORY INSTRUCTIONS — READ FIRST

1. Read this ENTIRE document before writing any code.
2. After reading, present your complete implementation strategy step by step.
3. Wait for explicit approval before executing anything.
4. Build ONE section at a time. After each section, confirm it works before continuing.
5. Never hardcode any business value — everything comes from the database.
6. If something is unclear, ask before assuming.
7. After every file you create, briefly explain what it does and why.

---

## 1. PROJECT OVERVIEW

A **multi-tenant SaaS inventory management system** for pest control companies.
Each company has isolated data, branding, users, locations, and products.

**Core workflow:**
Product catalog → Technician requests products → Supervisor approves (edits quantities) → Stock deducts immediately → Technician picks up

**Phase 1 client:** Victory Pest Solutions
**Dev URL:** http://localhost:3000
**Production URL:** https://inventory.victorypestsolutions.com

---

## 2. TECH STACK

```
Frontend:        Next.js 14 App Router (TypeScript)
Styling:         Tailwind CSS
UI Components:   shadcn/ui
PWA:             next-pwa
ORM:             Prisma
Database:        Neon PostgreSQL 17
Auth:            NextAuth.js v4 (JWT strategy)
Email:           Resend
Push:            Web Push API + VAPID keys (web-push package)
File Storage:    Vercel Blob
PDF Export:      @react-pdf/renderer
Excel Export:    SheetJS (xlsx)
Hosting:         Vercel
```

### shadcn/ui components to install
```
npx shadcn-ui@latest add button card input label select
npx shadcn-ui@latest add table badge dialog sheet
npx shadcn-ui@latest add dropdown-menu avatar toast
npx shadcn-ui@latest add form tabs separator skeleton
```

---

## 3. MULTI-TENANT ARCHITECTURE

### How it works
Every company gets its own subdomain. The system reads the request domain,
looks up the company in the database, and scopes ALL data to that company.

```
inventory.victorypestsolutions.com → company: Victory Pest Solutions
inventory.clienteB.com             → company: Cliente B
localhost:3000                     → company: first active company (dev only)
```

### Tenant middleware — middleware.ts (root level)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const domain = hostname.replace('www.', '').split(':')[0]
  const res = NextResponse.next()
  res.headers.set('x-tenant-domain', domain)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Tenant resolver — lib/tenant.ts

```typescript
// lib/tenant.ts
import { prisma } from './prisma'
import { headers } from 'next/headers'

export async function getTenant() {
  const headersList = headers()
  const domain = headersList.get('x-tenant-domain') || 'localhost'

  if (domain === 'localhost' || domain === '127.0.0.1') {
    return prisma.company.findFirst({ where: { active: true } })
  }

  const parts = domain.split('.')
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : domain

  return prisma.company.findUnique({ where: { domain: baseDomain } })
}
```

**CRITICAL:** Every API route must call getTenant() and use company.id
to filter ALL database queries. Never return data without company_id filter.

---

## 4. DATABASE SCHEMA (Prisma DSL)

Create this as prisma/schema.prisma. Run npx prisma db push to apply.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  id              String   @id @default(uuid())
  name            String
  domain          String   @unique
  logoUrl         String?
  primaryColor    String   @default("#1565C0")
  secondaryColor  String   @default("#29ABE2")
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())

  locations             Location[]
  users                 User[]
  products              Product[]
  productCategories     ProductCategory[]
  unitsOfMeasure        UnitOfMeasure[]
  suppliers             Supplier[]
  licenseTypes          LicenseType[]
  supervisorPermissions SupervisorPermissions?
  requests              Request[]
  stockMovements        StockMovement[]
  receptions            Reception[]
  transfers             Transfer[]
  physicalCounts        PhysicalCount[]
  notifications         Notification[]

  @@map("companies")
}

model Location {
  id        String   @id @default(uuid())
  companyId String
  name      String
  address   String?
  city      String?
  state     String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  company          Company           @relation(fields: [companyId], references: [id])
  users            User[]
  locationProducts LocationProduct[]
  stock            Stock[]
  requests         Request[]
  stockMovements   StockMovement[]
  receptions       Reception[]
  transfersFrom    Transfer[]        @relation("TransferFrom")
  transfersTo      Transfer[]        @relation("TransferTo")
  physicalCounts   PhysicalCount[]

  @@map("locations")
}

model LicenseType {
  id        String  @id @default(uuid())
  companyId String
  name      String
  active    Boolean @default(true)

  company         Company          @relation(fields: [companyId], references: [id])
  userLicenses    UserLicense[]
  productLicenses ProductLicense[]

  @@map("license_types")
}

model User {
  id              String   @id @default(uuid())
  companyId       String
  locationId      String?
  name            String
  email           String?
  username        String?  @unique
  passwordHash    String
  role            Role
  hasCompanyEmail Boolean  @default(false)
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())

  company            Company            @relation(fields: [companyId], references: [id])
  location           Location?          @relation(fields: [locationId], references: [id])
  licenses           UserLicense[]
  requestsCreated    Request[]          @relation("TechnicianRequests")
  requestsApproved   Request[]          @relation("ApprovedRequests")
  stockMovements     StockMovement[]
  receptionsReceived Reception[]
  transfersRequested Transfer[]         @relation("TransferRequested")
  transfersApproved  Transfer[]         @relation("TransferApproved")
  physicalCounts     PhysicalCount[]
  notifications      Notification[]
  pushSubscriptions  PushSubscription[]
  truckInventory     TruckInventory[]

  @@map("users")
}

enum Role {
  super_admin
  manager
  supervisor
  technician
}

model UserLicense {
  id            String @id @default(uuid())
  userId        String
  licenseTypeId String

  user        User        @relation(fields: [userId], references: [id])
  licenseType LicenseType @relation(fields: [licenseTypeId], references: [id])

  @@unique([userId, licenseTypeId])
  @@map("user_licenses")
}

model SupervisorPermissions {
  id                   String  @id @default(uuid())
  companyId            String  @unique
  canApproveRequests   Boolean @default(true)
  canEditQuantities    Boolean @default(true)
  canRejectRequests    Boolean @default(true)
  canManageCatalog     Boolean @default(false)
  canEditProducts      Boolean @default(false)
  canAdjustStock       Boolean @default(true)
  canReceiveStock      Boolean @default(true)
  canViewReports       Boolean @default(true)
  canManageTechnicians Boolean @default(false)
  canTransferStock     Boolean @default(false)

  company Company @relation(fields: [companyId], references: [id])

  @@map("supervisor_permissions")
}

model ProductCategory {
  id        String  @id @default(uuid())
  companyId String
  name      String
  active    Boolean @default(true)

  company  Company   @relation(fields: [companyId], references: [id])
  products Product[]

  @@map("product_categories")
}

model UnitOfMeasure {
  id           String  @id @default(uuid())
  companyId    String
  name         String
  abbreviation String?
  active       Boolean @default(true)

  company  Company   @relation(fields: [companyId], references: [id])
  products Product[]

  @@map("units_of_measure")
}

model Supplier {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  contactName String?
  email       String?
  phone       String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  company    Company     @relation(fields: [companyId], references: [id])
  products   Product[]
  receptions Reception[]

  @@map("suppliers")
}

model Product {
  id              String   @id @default(uuid())
  companyId       String
  categoryId      String?
  supplierId      String?
  unitId          String?
  name            String
  sku             String?
  unitCost        Decimal  @default(0) @db.Decimal(10, 2)
  epaRegistration String?
  photoUrl        String?
  requiresLicense Boolean  @default(false)
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())

  company          Company           @relation(fields: [companyId], references: [id])
  category         ProductCategory?  @relation(fields: [categoryId], references: [id])
  supplier         Supplier?         @relation(fields: [supplierId], references: [id])
  unit             UnitOfMeasure?    @relation(fields: [unitId], references: [id])
  licenses         ProductLicense[]
  locationProducts LocationProduct[]
  stock            Stock[]
  requestItems     RequestItem[]
  stockMovements   StockMovement[]
  receptionItems   ReceptionItem[]
  transferItems    TransferItem[]
  countItems       PhysicalCountItem[]
  truckInventory   TruckInventory[]

  @@map("products")
}

model ProductLicense {
  id            String @id @default(uuid())
  productId     String
  licenseTypeId String

  product     Product     @relation(fields: [productId], references: [id])
  licenseType LicenseType @relation(fields: [licenseTypeId], references: [id])

  @@unique([productId, licenseTypeId])
  @@map("product_licenses")
}

model LocationProduct {
  id         String  @id @default(uuid())
  locationId String
  productId  String
  minStock   Decimal @default(0) @db.Decimal(10, 2)
  maxStock   Decimal @default(0) @db.Decimal(10, 2)
  active     Boolean @default(true)

  location Location @relation(fields: [locationId], references: [id])
  product  Product  @relation(fields: [productId], references: [id])

  @@unique([locationId, productId])
  @@map("location_products")
}

model Stock {
  id         String   @id @default(uuid())
  locationId String
  productId  String
  quantity   Decimal  @default(0) @db.Decimal(10, 2)
  updatedAt  DateTime @default(now()) @updatedAt

  location Location @relation(fields: [locationId], references: [id])
  product  Product  @relation(fields: [productId], references: [id])

  @@unique([locationId, productId])
  @@map("stock")
}

model Request {
  id            String        @id @default(uuid())
  companyId     String
  locationId    String
  technicianId  String
  status        RequestStatus @default(pending)
  priority      Priority      @default(normal)
  note          String?
  rejectionNote String?
  approvedBy    String?
  approvedAt    DateTime?
  pickedUpAt    DateTime?
  createdAt     DateTime      @default(now())

  company    Company       @relation(fields: [companyId], references: [id])
  location   Location      @relation(fields: [locationId], references: [id])
  technician User          @relation("TechnicianRequests", fields: [technicianId], references: [id])
  approver   User?         @relation("ApprovedRequests", fields: [approvedBy], references: [id])
  items      RequestItem[]

  @@map("requests")
}

enum RequestStatus {
  pending
  approved
  rejected
  cancelled
  picked_up
}

enum Priority {
  urgent
  high
  normal
  low
}

model RequestItem {
  id                String   @id @default(uuid())
  requestId         String
  productId         String
  quantityRequested Decimal  @db.Decimal(10, 2)
  quantityApproved  Decimal? @db.Decimal(10, 2)
  unitCostAtTime    Decimal  @default(0) @db.Decimal(10, 2)

  request Request @relation(fields: [requestId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@map("request_items")
}

model StockMovement {
  id           String       @id @default(uuid())
  companyId    String
  locationId   String
  productId    String
  movementType MovementType
  quantity     Decimal      @db.Decimal(10, 2)
  referenceId  String?
  performedBy  String
  note         String?
  createdAt    DateTime     @default(now())

  company  Company  @relation(fields: [companyId], references: [id])
  location Location @relation(fields: [locationId], references: [id])
  product  Product  @relation(fields: [productId], references: [id])
  user     User     @relation(fields: [performedBy], references: [id])

  @@map("stock_movements")
}

enum MovementType {
  request_approval
  reception
  manual_adjustment
  transfer_out
  transfer_in
  physical_count
}

model Reception {
  id            String   @id @default(uuid())
  companyId     String
  locationId    String
  supplierId    String?
  invoiceNumber String?
  receivedBy    String
  receptionDate DateTime
  createdAt     DateTime @default(now())

  company   Company         @relation(fields: [companyId], references: [id])
  location  Location        @relation(fields: [locationId], references: [id])
  supplier  Supplier?       @relation(fields: [supplierId], references: [id])
  receiver  User            @relation(fields: [receivedBy], references: [id])
  items     ReceptionItem[]

  @@map("receptions")
}

model ReceptionItem {
  id          String  @id @default(uuid())
  receptionId String
  productId   String
  quantity    Decimal @db.Decimal(10, 2)
  unitCost    Decimal @default(0) @db.Decimal(10, 2)

  reception Reception @relation(fields: [receptionId], references: [id])
  product   Product   @relation(fields: [productId], references: [id])

  @@map("reception_items")
}

model Transfer {
  id             String         @id @default(uuid())
  companyId      String
  fromLocationId String
  toLocationId   String
  requestedBy    String
  approvedBy     String?
  status         TransferStatus @default(pending)
  note           String?
  createdAt      DateTime       @default(now())

  company      Company        @relation(fields: [companyId], references: [id])
  fromLocation Location       @relation("TransferFrom", fields: [fromLocationId], references: [id])
  toLocation   Location       @relation("TransferTo", fields: [toLocationId], references: [id])
  requester    User           @relation("TransferRequested", fields: [requestedBy], references: [id])
  approver     User?          @relation("TransferApproved", fields: [approvedBy], references: [id])
  items        TransferItem[]

  @@map("transfers")
}

enum TransferStatus {
  pending
  approved
  rejected
  completed
}

model TransferItem {
  id                String   @id @default(uuid())
  transferId        String
  productId         String
  quantityRequested Decimal  @db.Decimal(10, 2)
  quantityApproved  Decimal? @db.Decimal(10, 2)
  unitCostAtTime    Decimal  @default(0) @db.Decimal(10, 2)

  transfer Transfer @relation(fields: [transferId], references: [id])
  product  Product  @relation(fields: [productId], references: [id])

  @@map("transfer_items")
}

model PhysicalCount {
  id          String   @id @default(uuid())
  companyId   String
  locationId  String
  performedBy String
  countDate   DateTime
  createdAt   DateTime @default(now())

  company  Company             @relation(fields: [companyId], references: [id])
  location Location            @relation(fields: [locationId], references: [id])
  user     User                @relation(fields: [performedBy], references: [id])
  items    PhysicalCountItem[]

  @@map("physical_counts")
}

model PhysicalCountItem {
  id               String  @id @default(uuid())
  physicalCountId  String
  productId        String
  systemQuantity   Decimal @db.Decimal(10, 2)
  countedQuantity  Decimal @db.Decimal(10, 2)
  adjustmentReason String?

  physicalCount PhysicalCount @relation(fields: [physicalCountId], references: [id])
  product       Product       @relation(fields: [productId], references: [id])

  @@map("physical_count_items")
}

model TruckInventory {
  id        String   @id @default(uuid())
  userId    String
  productId String
  quantity  Decimal  @default(0) @db.Decimal(10, 2)
  updatedAt DateTime @default(now()) @updatedAt

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
  @@map("truck_inventory")
}

model Notification {
  id          String   @id @default(uuid())
  userId      String
  companyId   String
  type        String
  title       String
  message     String?
  read        Boolean  @default(false)
  referenceId String?
  createdAt   DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  company Company @relation(fields: [companyId], references: [id])

  @@map("notifications")
}

model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  endpoint  String
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("push_subscriptions")
}
```

---

## 5. AUTHENTICATION — DUAL LOGIN MODE

### Login logic
```
User types in the identifier field:
  Contains "@" → EMAIL login → query users.email (manager / supervisor)
  No "@"       → USERNAME login → query users.username (technician)
```

### Login page (app/(auth)/login/page.tsx)
- Full screen centered card — no sidebar, no nav
- Victory logo centered at top (from /public/logos/Victory_logo.png)
- Single input: placeholder "Email or Username"
- Password input with show/hide toggle
- "Sign In" button — brand primary color #1565C0
- Error message below button if credentials invalid
- "Forgot password?" link — visible ONLY when input contains "@"
- No registration link — users are created by managers only
- Works full screen on mobile with no scroll

### NextAuth credentials provider (lib/auth.ts)
```typescript
async authorize(credentials) {
  const { identifier, password } = credentials
  let user

  if (identifier.includes('@')) {
    user = await prisma.user.findFirst({
      where: { email: identifier, active: true },
      include: { licenses: true }
    })
  } else {
    user = await prisma.user.findFirst({
      where: { username: identifier, active: true },
      include: { licenses: true }
    })
  }

  if (!user) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    role: user.role,
    companyId: user.companyId,
    locationId: user.locationId ?? null,
    licenseIds: user.licenses.map(l => l.licenseTypeId),
  }
}
```

### Session type extension (types/next-auth.d.ts)
```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email?: string | null
      role: 'super_admin' | 'manager' | 'supervisor' | 'technician'
      companyId: string
      locationId?: string | null
      licenseIds: string[]
    }
  }
}
```

---

## 6. CORE WORKFLOW — TECHNICIAN CHECKOUT

### Creating a request
1. Technician opens catalog — products filtered by:
   - Their location's active location_products
   - Their license types (only products they are authorized for)
2. Selects products + quantities + priority + optional note
3. On submit — stock validation:
   - If quantity_requested > stock.quantity: auto-adjust to stock.quantity
   - Show yellow banner: "Adjusted: [Product] reduced from X to Y (max available)"
   - If stock.quantity = 0: show "Out of stock" — cannot add to request
   - Technician confirms adjusted quantities before submitting
4. Request created with status: pending
5. Technician can cancel while status = pending

### Approval (supervisor/manager)
- Can edit quantity_approved per item (must be ≤ current stock)
- On APPROVE:
  - Deduct stock immediately for each item (quantity_approved)
  - Create stock_movements record (type: request_approval, quantity: negative)
  - Status → approved
  - Notify technician
- On REJECT:
  - Rejection note required
  - Status → rejected
  - Notify technician

### Pickup
- Technician sees approved quantities (not original requested)
- Taps "Mark as Picked Up" → status: picked_up
- If truck_inventory enabled → add quantities to truck_inventory

---

## 7. NOTIFICATION EVENTS

| Event | Recipients | Channel |
|---|---|---|
| New request URGENT | Supervisors (location) + Managers | Push + Email |
| New request other | Supervisors (location) + Managers | Push + Email |
| Request auto-adjusted | Supervisor + Manager | Push + Email |
| Request approved | Technician | Push + Email if has email |
| Request rejected | Technician | Push + Email if has email |
| Request cancelled | Supervisor + Manager | Email only |
| Stock below minimum | Supervisor (location) + Manager | Push + Email |
| Reception registered | Manager | Email |
| Transfer requested | Manager | Push + Email |
| Transfer approved/rejected | Requesting supervisor | Push + Email |

---

## 8. SCREENS — DETAILED DESCRIPTION

### Login `/login`
Full screen card. Logo top center. Single identifier input. Password with toggle.
Sign In button (primary color). Error message inline. Forgot password only for email users.

### Dashboard `/dashboard`

**Technician:**
- Hero card: "Ready to pick up" — approved request with CTA "Pick Up Now"
- My active requests list (pending + approved)
- Floating "+ New Request" button bottom right

**Supervisor:**
- Pending approvals card with count badge — "Review Now" CTA
- URGENT requests highlighted red at top
- Low stock alerts for their location
- Recent activity (last 5 movements)

**Manager:**
- 4 stat cards: Pending / Low Stock / Locations / Active Technicians
- Requests by location bar chart
- Cross-location stock summary table
- Recent activity all locations

### Requests `/requests`

**Technician:** My requests only. Tabs: All/Pending/Approved/Picked Up/Rejected.
Card shows: ID, date, priority badge, status, products list with quantities.
APPROVED card has "Mark as Picked Up" button. PENDING card has "Cancel" button.

**Supervisor/Manager:** All requests in scope. Filter: Location/Status/Priority/Date/Technician.
Sorted: urgent first, then by date. Approval opens side sheet (mobile: bottom sheet):
  - Each product line with editable quantity input
  - Current stock shown next to each input
  - Approve / Reject buttons. Reject requires note.

### New Request `/requests/new` (Technician only)
Step 1 — Catalog: category filter tabs, search bar, product cards with photo/name/SKU/stock.
Step 2 — Cart (sticky bottom bar): product list, quantity inputs, priority selector, note field, stock warnings, Submit button.

### Inventory `/inventory`
Table: Product | SKU | Category | Stock | Min | Max | Status | Actions
Status: green OK / yellow Low / red Critical.
Adjust button opens modal with delta input + reason dropdown.
Manager: location tabs. Export: PDF / Excel buttons.

### Receptions `/receptions`
List of past receptions. New Reception button:
Location | Supplier | Invoice (optional) | Date | Product lines (product + qty + cost) | Submit

### Transfers `/transfers`
List with status. New Transfer: From location | To location | Products | Note | Submit.
Approval by manager only — same side sheet pattern.

### Reports `/reports`
Left sidebar (desktop) / tab bar (mobile) with report types.
Date filter: Weekly / Biweekly / Monthly / Quarterly / Custom range.
Location filter. Report renders inline. Export bar: PDF / Excel / Print.
Header on all reports: company logo + name + report title + date range.

### Settings `/settings` (Manager only)
Tabs:
- Company: logo upload, primary color, secondary color, company name
- Locations: list with add/edit/deactivate
- Users: list with create/edit/deactivate, role, location, licenses
- Permissions: toggle grid for all supervisor permissions
- Catalog: sub-tabs Categories / Units / License Types / Suppliers / Products
- Notifications: toggle per event type

---

## 9. LAYOUT SYSTEM

### Desktop (>=768px) — Left sidebar
```
[Logo]
[Nav items by role]
[User avatar + name at bottom]
  |
  +-- [Header: breadcrumb + notification bell]
      [Page content]
```

### Mobile (<768px) — Bottom navigation
```
[Header: logo + bell]
[Page content — full width]
[Bottom nav: 5 items by role]
```

### Bottom nav by role
- Technician:  Home | Catalog | Requests | Notifications | Profile
- Supervisor:  Home | Approvals🔴 | Inventory | Notifications | Profile
- Manager:     Home | Requests | Inventory | Reports | More(...)

---

## 10. BRANDING — VICTORY PEST SOLUTIONS

```
Primary:     #1565C0
Secondary:   #29ABE2
Dark:        #2D2D2D
Background:  #F4F4F4
White:       #FFFFFF
Success:     #16A34A
Warning:     #D97706
Error:       #DC2626

Headings:    Oswald (Google Fonts — 400, 600, 700)
Body:        Source Sans 3 (Google Fonts — 400, 600)

Logo:        /public/logos/Victory_logo.png
```

### tailwind.config.ts additions
```javascript
theme: {
  extend: {
    colors: {
      brand: {
        primary:   '#1565C0',
        secondary: '#29ABE2',
        dark:      '#2D2D2D',
      }
    },
    fontFamily: {
      heading: ['Oswald', 'sans-serif'],
      body:    ['Source Sans 3', 'sans-serif'],
    }
  }
}
```

---

## 11. REPORTS

All reports header: company logo + name + report title + date range + location applied.
All reports: exportable PDF (React-PDF), Excel (SheetJS), printable.
Date filters: Weekly / Biweekly / Monthly / Quarterly / Custom range.

| Report | Columns | Access |
|---|---|---|
| Current Stock | Product, SKU, Category, Unit, Stock, Min, Max, Status, Unit Cost, Total Value | Sup + Mgr |
| Below Minimum | Product, SKU, Location, Current, Min, Deficit, Supplier | Sup + Mgr |
| Request History | ID, Date, Technician, Priority, Products, Status, Approved By | Sup + Mgr |
| Reception Log | Date, Supplier, Invoice, Products, Qty, Cost, Received By | Sup + Mgr |
| Adjustment Log | Date, Product, Before, After, Delta, Reason, By | Sup + Mgr |
| Consumption by Tech | Technician, Location, Requests, Items, Total Value | Mgr only |
| Consumption by Product | Product, Requests, Total Qty, Total Value, Trend | Mgr only |
| Inventory Valuation | Product, Category, Stock, Unit Cost, Total Value (by location) | Mgr only |
| Most Requested | Product, Request Count, Total Qty (ranked) | Mgr only |
| Waste/Shrinkage | Product, Count Date, System Qty, Counted, Variance, Variance%, Reason | Mgr only |
| Location Comparison | Location, Total Stock Value, Requests, Consumption, Low Stock Count | Mgr only |
| Transfer History | Date, From, To, Products, Status, Approved By | Mgr only |

---

## 12. ENVIRONMENT VARIABLES

```env
DATABASE_URL=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY=""
RESEND_FROM_EMAIL="noreply@victorypestsolutions.com"
BLOB_READ_WRITE_TOKEN=""
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:juan@victoryoverpests.com"
```

Generate VAPID keys with: npx web-push generate-vapid-keys
Generate NEXTAUTH_SECRET with: openssl rand -base64 32

---

## 13. FOLDER STRUCTURE

```
victory-inventory/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── requests/page.tsx
│   │   ├── requests/new/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── receptions/page.tsx
│   │   ├── transfers/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   └── notifications/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── requests/route.ts
│       ├── requests/[id]/approve/route.ts
│       ├── requests/[id]/reject/route.ts
│       ├── requests/[id]/pickup/route.ts
│       ├── requests/[id]/cancel/route.ts
│       ├── products/route.ts
│       ├── stock/route.ts
│       ├── stock/adjust/route.ts
│       ├── receptions/route.ts
│       ├── transfers/route.ts
│       ├── reports/[type]/route.ts
│       ├── notifications/route.ts
│       └── push/subscribe/route.ts
├── components/
│   ├── ui/
│   ├── layout/Sidebar.tsx
│   ├── layout/BottomNav.tsx
│   ├── layout/Header.tsx
│   ├── requests/RequestCard.tsx
│   ├── requests/RequestForm.tsx
│   ├── requests/ApprovalSheet.tsx
│   ├── inventory/StockTable.tsx
│   ├── inventory/AdjustModal.tsx
│   ├── reports/ReportViewer.tsx
│   └── reports/ExportButtons.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── tenant.ts
│   ├── push.ts
│   ├── email.ts
│   └── permissions.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── types/next-auth.d.ts
├── public/logos/Victory_logo.png
├── middleware.ts
├── .env.local
└── CLAUDE.md
```

---

## 14. DEVELOPMENT SEQUENCE

Follow this order. Do not skip steps. Confirm each phase works before continuing.

```
PHASE 1 — Foundation
  1. npx create-next-app@latest victory-inventory --typescript --tailwind --app
  2. Install all dependencies
  3. Configure Tailwind (brand colors + fonts)
  4. Prisma schema → npx prisma db push
  5. Tenant middleware
  6. NextAuth dual-mode login
  7. Login page

PHASE 2 — Shell
  8. Dashboard layout (Sidebar + BottomNav + Header)
  9. Role-based route protection
  10. Dashboard pages (3 versions: tech/supervisor/manager)

PHASE 3 — Core workflow (most important)
  11. Product catalog with license filtering
  12. New request form with stock validation + auto-adjust
  13. Requests list (technician view)
  14. Approval flow with quantity editing (supervisor/manager)
  15. Stock deduction on approval + stock_movements record
  16. Pickup confirmation

PHASE 4 — Inventory
  17. Inventory table with status indicators
  18. Manual adjustment modal
  19. Receptions form
  20. Transfers workflow

PHASE 5 — Notifications
  21. Push subscription service worker
  22. Resend email notifications
  23. Notification bell + list

PHASE 6 — Reports
  24. Report viewer with filters
  25. All reports (Section 11)
  26. PDF export
  27. Excel export

PHASE 7 — Settings
  28. Settings page all tabs
  29. User management
  30. Supervisor permissions toggle
  31. Catalog management

PHASE 8 — Deploy
  32. PWA manifest + icons
  33. Seed database
  34. Deploy to Vercel
  35. Set environment variables in Vercel dashboard
```

---

## 15. SEED DATA (prisma/seed.ts)

```
Company:  Victory Pest Solutions | domain: localhost | colors: #1565C0/#29ABE2

Locations:
  Norte – Newark, NJ
  Central – Trenton, NJ
  Sur – Camden, NJ

License types:
  General Pest Control | Termite/WDO | Fumigation | Rodent Control | Wildlife

Categories: Rodenticide | Insecticide | Fumigant | Trap/Device | PPE | Equipment

Test users:
  super@admin.com      / Admin123!    → super_admin
  manager@victory.com  / Manager123!  → manager
  sup1@victory.com     / Super123!    → supervisor, Newark
  tech1 (username)     / Tech123!     → technician, Newark, General Pest + Rodent licenses
  tech2 (username)     / Tech123!     → technician, Newark, General Pest license only

Sample products (set stock = 50 for all, minStock = 10, maxStock = 100):
  Contrac Blox 18kg   | ROD-001 | Rodenticide | Rodent Control license required
  Temprid SC 240ml    | INS-001 | Insecticide | General Pest license required
  Demand CS 473ml     | INS-002 | Insecticide | General Pest license required
  Victor Snap Trap    | TRP-001 | Trap/Device | no license required
  Respirator 3M N95   | EPP-001 | PPE         | no license required
```

---

*CLAUDE.md v2.0 — Victory Pest Inventory System*
*Do not modify without approval from project owner (juan@victoryoverpests.com)*
*Last updated: May 2026*
