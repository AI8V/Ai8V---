const VERSION = 'v1.0.0';
const CACHE = `ai8v-${VERSION}`;

// القائمة الموحدة للملفات الأساسية
const CORE = [
  '/',
  '/index.html',
  '/assets/bootstrap/css/bootstrap.min.css',
  '/assets/bootstrap/js/bootstrap.min.js',
  '/assets/css/bs-theme-overrides.css',
  '/assets/js/script.js',
  '/assets/img/apple-touch-icon.png',
  '/assets/img/favicon-16x16.png',
  '/assets/img/favicon-16x16-dark.png',
  '/assets/img/favicon-32x32.png',
  '/assets/img/favicon-32x32-dark.png',
  '/assets/img/android-chrome-192x192.png',
  '/assets/img/android-chrome-512x512.png',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml'
];

// تثبيت
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
});

// تنشيط
self.addEventListener('activate', e => {
  self.clients.claim();
  e.waitUntil(caches.keys().then(keys => 
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});

// إضافة رأس Content-Type لمنع مشاكل MIME
const addContentTypeHeader = response => {
  if (!response || !response.headers || response.type !== 'basic') return response;
  const url = response.url;
  const newHeaders = new Headers(response.headers);
  if (!newHeaders.has('Content-Type')) {
    let contentType = 'application/octet-stream'; // default fallback
    if (url.endsWith('.html') || url === '/' || url.endsWith('/')) {
      contentType = 'text/html; charset=utf-8';
    } else if (url.endsWith('.js')) {
      contentType = 'application/javascript; charset=utf-8';
    } else if (url.endsWith('.css')) {
      contentType = 'text/css; charset=utf-8';
    } else if (url.endsWith('.json')) {
      contentType = 'application/json; charset=utf-8';
    } else if (url.endsWith('.png')) {
      contentType = 'image/png';
    } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (url.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (url.endsWith('.webp')) {
      contentType = 'image/webp';
    }
    newHeaders.set('Content-Type', contentType);
  }
  return response.clone ? new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  }) : response;
};

// التعامل مع الرسائل
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// تعامل مع الطلبات
self.addEventListener('fetch', e => {
  // فقط طلبات GET
  if (e.request.method !== 'GET') return;
  // تجاهل الطلبات الخارجية أو من إضافات المتصفح
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // إرجاع المُخزن إذا وُجد
      if (cached) return addContentTypeHeader(cached);
      
      // محاولة الحصول من الشبكة
      return fetch(e.request)
        .then(response => {
          // تخزين النسخة الجديدة إذا كانت صالحة
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, copy));
          }
          return addContentTypeHeader(response);
        })
        .catch(() => {
          // إذا فشل وطُلب صفحة HTML، نُرجع صفحة البداية
          if (e.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
          return new Response('غير متصل', {status: 503});
        });
    })
  );
});
