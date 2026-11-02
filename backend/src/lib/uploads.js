import { fileURLToPath } from 'node:url';

// Berkas gambar disimpan di backend/uploads agar tidak tercampur dengan source code.
export const uploadsDir = fileURLToPath(new URL('../../uploads/', import.meta.url));
