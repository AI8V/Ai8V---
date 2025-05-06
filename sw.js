importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const VERSION = 'v1.0.10';
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
];

// حدث التثبيت - تخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  // تخطي الانتظار للتنشيط الفوري
  self.skipWaiting();
  
  // تخزين الملفات الأساسية
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => {
        return cache.addAll(CORE);
      })
      .catch(error => {
        console.error('خطأ في تخزين الملفات الأساسية:', error);
      })
  );
});

// حدث التنشيط - إزالة التخزين المؤقت القديم
self.addEventListener('activate', (event) => {
  // المطالبة بأن يكون هذا الـ service worker هو المتحكم في العملاء
  self.clients.claim();
  
  // إزالة التخزين المؤقت القديم
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE && key.startsWith('ai8v-'))
          .map(key => caches.delete(key))
      );
    })
  );
});

// حدث الرسائل - للتحديث
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// حدث الطلبات - للتخزين المؤقت والعمل دون اتصال
self.addEventListener('fetch', (event) => {
  // فقط طلبات GET
  if (event.request.method !== 'GET') return;
  
  // تجاهل الطلبات الخارجية
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('onesignal') && 
      !event.request.url.includes('OneSignal')) {
    return;
  }
  
  // استراتيجية التخزين المؤقت: محاولة من التخزين المؤقت أولاً، ثم الشبكة
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إرجاع النسخة المخزنة إذا وجدت
        if (response) {
          return response;
        }
        
        // وإلا، احصل عليها من الشبكة
        return fetch(event.request)
          .then(networkResponse => {
            // تخزين النسخة الجديدة إذا كانت صالحة
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch(() => {
            // إذا طلب HTML، ارجع صفحة البداية
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
            
            // وإلا، ارجع رسالة خطأ
            return new Response('أنت غير متصل بالإنترنت.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});
