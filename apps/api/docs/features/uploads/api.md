# Uploads API

## GET /api/admin/uploads/imagekit-auth

Returns short-lived credentials for one direct browser → ImageKit upload. Request a new set per upload.

Auth: admin (`admin`+). `Cache-Control: no-store`.

Response `200`:

```json
{
  "data": {
    "token": "5c8f6a0e-…",
    "expire": 1790125000,
    "signature": "a1b2c3…",
    "publicKey": "public_xxx",
    "urlEndpoint": "https://ik.imagekit.io/acme",
    "folder": "/products"
  }
}
```

- `signature = HMAC-SHA1(IMAGEKIT_PRIVATE_KEY, token + expire)` (hex), the format ImageKit expects.
- `expire` is a Unix timestamp in seconds, 30 minutes ahead.

Errors: `401`, `403` (staff cannot sign uploads).

### Using it from the browser

```ts
const { data: auth } = await api.get('/api/admin/uploads/imagekit-auth')
const form = new FormData()
form.append('file', file)
form.append('fileName', file.name)
form.append('publicKey', auth.publicKey)
form.append('signature', auth.signature)
form.append('expire', String(auth.expire))
form.append('token', auth.token)
form.append('folder', auth.folder)
form.append('useUniqueFileName', 'true')
const uploaded = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form }).then((r) => r.json())

// Then register it on a color:
await api.post(`/api/admin/products/${productId}/colors/${colorId}/images`, {
  imageUrl: uploaded.url,
  imageKitFileId: uploaded.fileId,
})
```

Registering images: [products api.md › Images](../products/api.md#images).
