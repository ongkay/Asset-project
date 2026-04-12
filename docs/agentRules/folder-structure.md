# FOLDER STRUCTURE RULES

## Route-Colocated UI + Domain-Centric Server

## 1. Tujuan
Dokumen ini adalah aturan resmi struktur folder untuk agent AI dan developer.

Prinsip utama:
- UI yang hanya dipakai satu route harus diletakkan dekat route tersebut.
- Logic backend harus dikelompokkan per domain di `src/server/`.
- Shared UI harus diletakkan di `src/components/`.
- Shared infra/helper harus diletakkan di `src/lib/`.
- Jangan buat struktur `features/` flat yang besar.

---

## 2. Struktur Resmi
Catatan:
- `loading.tsx`, `error.tsx`, `schema.ts`, `types.ts`, dan `_components/` dibuat hanya jika memang diperlukan route tersebut.

```text
assetnext/
├── app/
│   ├── (public)/
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── _components/
│   │   └── reset-password/
│   │       ├── page.tsx
│   │       ├── schema.ts
│   │       ├── types.ts
│   │       └── _components/
│   ├── (member)/
│   │   ├── console/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── _components/
│   │   └── paymentdummy/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       ├── schema.ts
│   │       ├── types.ts
│   │       └── _components/
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── _components/
│   │   ├── assets/
│   │   │   ├── page.tsx
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── _components/
│   │   ├── cdkey/
│   │   │   ├── page.tsx
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── _components/
│   │   ├── package/
│   │   │   ├── page.tsx
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── _components/
│   │   ├── subscriber/
│   │   │   ├── page.tsx
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── _components/
│   │   ├── userlogs/
│   │   │   ├── page.tsx
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── _components/
│   │   └── users/
│   │       ├── page.tsx
│   │       ├── schema.ts
│   │       ├── types.ts
│   │       └── _components/
│   └── api/
│       ├── extension/
│       │   ├── session/route.ts
│       │   ├── asset/route.ts
│       │   └── track/route.ts
│       └── cron/
│           ├── expire-subscriptions/route.ts
│           └── reconcile-assets/route.ts
├── public/
├── src/
│   ├── components/
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── tables/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── cookies/
│   │   ├── env/
│   │   ├── errors/
│   │   ├── format/
│   │   ├── insforge/
│   │   ├── nonce/
│   │   ├── react-query/
│   │   ├── request/
│   │   ├── safe-action/
│   │   ├── session/
│   │   ├── utils/
│   │   └── validation/
│   ├── providers/
│   ├── server/
│   │   ├── admin/
│   │   ├── assets/
│   │   ├── auth/
│   │   ├── cdkeys/
│   │   ├── cron/
│   │   ├── extension/
│   │   ├── packages/
│   │   ├── subscriptions/
│   │   └── users/
│   ├── stores/
│   └── types/
├── tests/
│   ├── components/
│   ├── integration/
│   ├── setup/
│   └── smoke/
├── migrations/
└── .docs/
```

---

## 3. Aturan Penempatan File

### 3.1. `app/`
Taruh di `app/`:
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- `_components/` yang hanya dipakai satu route
- `schema.ts` dan `types.ts` yang hanya dipakai route itu

Jangan taruh di `app/`:
- query DB
- service multi-step backend
- guard global
- helper shared lintas domain

### 3.2. `src/server/`
Taruh di `src/server/<domain>/`:
- `queries.ts` untuk read-only query
- `actions.ts` untuk Server Actions
- `service.ts` untuk flow multi-step
- `schema.ts` untuk schema backend/domain
- `types.ts` untuk type domain yang dipakai ulang
- `guards.ts`, `rules.ts`, `mapper.ts`, `dto.ts` jika memang perlu

Aturan domain:
- logic inti subscription tetap di `src/server/subscriptions/`
- jangan buat domain ganda seperti `src/server/admin/subscriber/`
- admin page adalah tampilan atas domain yang sama, bukan domain baru

### 3.3. `src/components/`
Taruh di `src/components/` hanya jika komponen dipakai lintas banyak route.

Contoh yang cocok:
- generic dialog
- shared form field
- shared table wrapper
- shared layout pieces
- shared badge atau avatar cell

### 3.4. `src/lib/`
Taruh di `src/lib/` hanya untuk shared infra dan helper teknis.

Contoh yang cocok:
- env
- InsForge clients
- cookies
- session helper
- nonce helper
- request metadata helper
- error classes/mappers
- formatters
- `next-safe-action` setup
- `react-query` setup

Jangan taruh business logic besar di `src/lib/`.

### 3.5. Aturan Import Boundary
Aturan wajib:
- file server di `app/**` boleh import dari `src/server/**`, `src/components/**`, `src/lib/**`, dan `src/types/**`
- client component di `app/**` atau `src/components/**` tidak boleh import `src/server/**`
- `src/server/**` tidak boleh import dari `app/**`
- `src/components/**` tidak boleh import dari route-specific `_components/`
- `src/lib/**` tidak boleh import dari `app/**`
- `src/lib/**` tidak boleh bergantung pada `src/server/**` kecuali helper yang memang khusus server dan tetap berada di boundary server-only

Rule sederhana:
- route boleh memakai server
- server tidak boleh memakai route
- shared tidak boleh bergantung pada file lokal route

### 3.6. Aturan Server-Only Boundary
Folder berikut harus dianggap server-only:
- `src/server/**`
- `src/lib/insforge/**`
- `src/lib/session/**`
- `src/lib/safe-action/**`
- helper sensitif seperti `src/lib/auth/current-user.ts`, `src/lib/auth/guards.ts`, `src/lib/auth/password.ts`, helper internal di `src/lib/cookies/**`, helper sensitif di `src/lib/request/**`, dan `src/lib/env/server.ts`

Aturan wajib:
- client component tidak boleh import file server-only
- browser tidak boleh mengakses service key, DB client server, atau helper session internal
- endpoint `app/api/**` dan Server Actions adalah boundary resmi untuk expose logic server ke client

---

## 4. Aturan `schema.ts` dan `types.ts`

### 4.1. `schema.ts`
Taruh di `schema.ts` jika:
- itu Zod schema
- itu dipakai untuk form/filter/action payload

Aturan:
- hasil `z.infer<typeof schema>` tetap tinggal di `schema.ts`

Contoh:

```ts
export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type SignInInput = z.infer<typeof signInSchema>;
```

### 4.2. `types.ts`
Taruh di `types.ts` jika:
- type tidak berasal langsung dari Zod
- type dipakai ulang lintas file
- type cukup besar atau kompleks
- type dipakai oleh `queries.ts`, `actions.ts`, `service.ts`, atau component lain

Contoh yang cocok di `types.ts`:
- DTO response
- raw RPC row type besar
- view model
- type input/output service

### 4.3. Batas Type Lokal per File
Aturan wajib:
- satu file hanya boleh memiliki maksimal `2` type lokal sederhana
- jika type lebih dari `2`, pindahkan ke `types.ts`
- jika type mulai berat, pindahkan ke `types.ts`
- jika type dipakai ulang di file lain, pindahkan ke `types.ts`

Definisi type lokal sederhana:
- pendek
- tidak punya nesting besar
- hanya membantu satu function atau satu komponen di file itu

Jika ragu, pindahkan ke `types.ts`.

---

## 5. Aturan `queries.ts`, `actions.ts`, `service.ts`

### 5.1. `queries.ts`
- hanya untuk read-only
- tidak boleh insert/update/delete
- wajib reuse view/RPC jika tersedia
- harus mengembalikan data yang siap dipakai UI atau action

### 5.2. `actions.ts`
- rumah untuk Server Actions
- validasi input dulu
- jangan terlalu gemuk
- jika flow lebih dari satu langkah, panggil `service.ts`

### 5.3. `service.ts`
- hanya untuk flow multi-step
- contoh: login + create session, activation subscription, disable/delete asset, extension access validation

---

## 6. Aturan React Query dan Next Safe Action

### 6.1. React Query
`react-query` hanya dipakai untuk query / read state.

Aturan wajib:
- jangan pakai `react-query` untuk mutation bisnis
- mutation tetap ditangani oleh Server Actions di `src/server/<domain>/actions.ts`
- komponen client boleh memakai `react-query` untuk fetch/cache data query

### 6.2. Next Safe Action
`next-safe-action` adalah wrapper resmi untuk Server Actions.

Aturan wajib:
- setup shared ada di `src/lib/safe-action/`
- action bisnis tetap hidup di `src/server/<domain>/actions.ts`

---

## 7. Kapan Pindah ke Shared
Pindahkan file dari route ke shared jika:
- dipakai minimal 3 route
- nama file sudah generik
- file tidak lagi spesifik ke satu flow halaman

Pindahkan `schema.ts` / `types.ts` dari route ke `src/server/<domain>/` jika:
- dipakai backend
- dipakai lebih dari satu route
- mulai berisi aturan domain, bukan sekadar UI

---

## 8. Anti-Pattern
Hindari:
- folder `features/` flat yang besar
- logic domain tersebar di banyak namespace serupa
- shared component yang sebenarnya hanya dipakai satu route
- semua type ditaruh di satu `src/types/` global
- `queries.ts` yang berisi mutation
- `react-query` dipakai untuk mutation bisnis

---

## 9. Checklist Cepat Saat Menambah File
1. Kalau file hanya dipakai satu route: taruh dekat route.
2. Kalau file adalah backend logic: taruh di `src/server/<domain>/`.
3. Kalau file adalah shared UI: taruh di `src/components/`.
4. Kalau file adalah helper infra: taruh di `src/lib/`.
5. Kalau type dari Zod: tetap di `schema.ts`.
6. Kalau type non-Zod dipakai ulang, berat, atau lebih dari 2 lokal: pindah ke `types.ts`.

---

## 10. Ringkasan Final
Struktur resmi project ini adalah:
- `app/` untuk route dan route-local UI
- `src/server/` untuk backend logic per domain
- `src/components/` untuk shared UI
- `src/lib/` untuk shared infra/helper teknis
- `react-query` hanya untuk query
- mutation hanya lewat Server Actions
- type lokal maksimal 2 per file, sisanya pindah ke `types.ts`

Dokumen ini harus dianggap sebagai rule tetap saat agent AI membangun project ini.
