# InvoiceKu API
Dokumentasi API untuk integrasi pengganti payment dummy saat ini

## Base URL
```txt
https://invoiceku.net/api/v1
```

## Authentication
Semua request wajib menggunakan header:

```http
Authorization: Bearer ik_test_YOUR_API_KEY

```

---

## 2. Create Invoice Instant QRIS

Membuat tagihan baru dan mendapatkan QRIS secara instan.

### Endpoint

```http
POST /invoice
```

### Request
```bash
curl -X POST https://invoiceku.net/api/v1/invoice \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "item_name": "Premium Upgrade",
    "customer_name": "John Doe",
    "email": "customer@example.com"
  }'
```

### Body
```json
{
  "amount": 50000,
  "item_name": "Premium Upgrade",
  "customer_name": "John Doe",
  "email": "customer@example.com"
}
```

### Success Response
```json
{
  "status": "success",
  "data": {
    "invoice_id": "INV-D1E4-7586",
    "amount_original": 50000,
    "amount_total": 50123,
    "status": "pending",
    "qris_string": "00020101021226590013ID...",
    "qris_image_url": "https://api.qrserver.com/...",
    "payment_url": "https://invoiceku.net/invoice/INV-D1E4-7586",
    "expired_at": "2026-01-28 14:00:00"
  }
}
```

---

## 3. Check Status Pembayaran
Mengecek status pembayaran berdasarkan `invoice_id`.

### Endpoint
```http
GET /invoice/{invoice_id}
```

### Request
```bash
curl -X GET https://invoiceku.net/api/v1/invoice/INV-D1E4-7586 \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY"
```

### Success Response
```json
{
  "status": "success",
  "data": {
    "invoice_id": "INV-D1E4-7586",
    "order_id": "ORD-2024-001",
    "status": "paid",
    "amount_total": 50123,
    "paid_at": "2026-01-28 13:40:14"
  }
}
```

---

## 4. Cancel Invoice
Membatalkan invoice yang masih berstatus `pending`.

### Endpoint
```http
POST /invoice/{invoice_id}/cancel
```

### Request
```bash
curl -X POST https://invoiceku.net/api/v1/invoice/INV-D1E4-7586/cancel \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY"
```

### Success Response
```json
{
  "status": "success",
  "message": "Invoice cancelled successfully",
  "data": {
    "invoice_id": "INV-D1E4-7586",
    "status": "failed"
  }
}
```

---

## Error Codes

| Code  | Description                                       |
| ----- | ------------------------------------------------- |
| `401` | API Key salah atau tidak ada Authorization header |
| `404` | Invoice ID tidak ditemukan                        |
| `503` | Gagal request ke Bank                             |
