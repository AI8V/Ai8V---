const CACHE = 'ai8v-v1';

// القائمة الأساسية للملفات
const CORE = [
  '/',
  '/index.html',
  '/assets/bootstrap/css/bootstrap.min.css',
  '/assets/css/bs-theme-overrides.css',
  '/assets/js/script.js'
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

// إضافة رأس لمنع مشكلة RSS Detection
const addContentTypeHeader = response => {
  // إذا لم تكن هناك استجابة أو كانت غير قابلة للتعديل
  if (!response || !response.headers || response.type !== 'basic') return response;
  
  // إنشاء نسخة من الاستجابة مع رأس جديد
  const newHeaders = new Headers(response.headers);
  if (!newHeaders.has('Content-Type')) {
    // تعيين نوع المحتوى للمستندات HTML
    if (response.url.endsWith('.html') || response.url === '/' || response.url.endsWith('/')) {
      newHeaders.set('Content-Type', 'text/html; charset=utf-8');
    }
  }
  
  return response.clone ? new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  }) : response;
};

// تعامل مع الطلبات
self.addEventListener('fetch', e => {
  // فقط طلبات GET
  if (e.request.method !== 'GET') return;

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
          // إذا فشل ورُطب صفحة HTML، نُرجع صفحة البداية
          if (e.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
          return new Response('غير متصل', {status: 503});
        });
    })
  );
});
