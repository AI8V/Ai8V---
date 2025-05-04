// إصدار الكاش، يمكنك تغييره عند تحديث موقعك
const CACHE_NAME = 'ai8v-cache-v2';

// قائمة الملفات التي ترغب في تخزينها محلياً
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/bootstrap/css/bootstrap.min.css',
  '/assets/css/bs-theme-overrides.css',
  '/assets/js/script.js',
  '/assets/img/apple-touch-icon.png',
  '/assets/img/favicon-16x16.png',
  '/assets/img/favicon-16x16-dark.png',
  '/assets/img/favicon-32x32.png',
  '/assets/img/favicon-32x32-dark.png',
  '/assets/img/android-chrome-192x192.png',
  '/assets/img/android-chrome-512x512.png',
  'https://fonts.googleapis.com/css?family=Amiri&display=swap',
  'https://fonts.googleapis.com/css?family=Noto+Sans+Arabic&display=swap'
];

// تثبيت Service Worker وتخزين الملفات
self.addEventListener('install', event => {
  // تنفيذ عملية التثبيت بشكل فوري ودون انتظار
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم فتح الكاش بنجاح');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('خطأ في تخزين بعض الملفات:', err);
          // الاستمرار في تخزين ما أمكن من الملفات
        });
      })
  );
});

// استراتيجية خدمة الطلبات: محاولة الكاش أولاً، ثم الشبكة (Cache First)
self.addEventListener('fetch', event => {
  // تجاهل طلبات POST وطلبات مختلفة النطاق
  if (event.request.method !== 'GET') {
    return;
  }

  // فحص إذا كان الطلب لموقع خارجي (مثل الخطوط من Google)
  const url = new URL(event.request.url);
  const isExternal = url.origin !== location.origin && 
                     !url.hostname.includes('fonts.googleapis.com') && 
                     !url.hostname.includes('fonts.gstatic.com');

  // لا نخزن الطلبات الخارجية باستثناء Google Fonts
  if (isExternal) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // إذا وجد استجابة في الكاش، قم بإرجاعها
        if (cachedResponse) {
          // في الخلفية، قم بتحديث النسخة المخزنة إذا أمكن
          // هذا يعمل على استراتيجية "stale-while-revalidate"
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  })
                  .catch(err => console.error('خطأ في تحديث الكاش:', err));
              }
              return networkResponse;
            })
            .catch(() => {
              // فشل الاتصال بالشبكة، الاستمرار بالنسخة المخزنة
            });
          
          return cachedResponse;
        }
        
        // إذا لم تجد في الكاش، اذهب للشبكة
        return fetch(event.request)
          .then(response => {
            // تخزين في الكاش فقط إذا كان طلب GET وناجح
            if (!response || response.status !== 200) {
              return response;
            }

            // تخزين نسخة في الكاش
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => console.error('خطأ في تخزين الاستجابة:', err));

            return response;
          })
          .catch(error => {
            console.error('فشل جلب البيانات من الشبكة:', error);
            
            // إذا كان الطلب لصفحة HTML، ارجع الصفحة الرئيسية
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // إذا فشل كل شيء، ارجع خطأ
            return new Response('حدث خطأ في الاتصال بالشبكة', {
              status: 503,
              statusText: 'خدمة غير متاحة',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// تحديث الكاش عند تحديث Service Worker
self.addEventListener('activate', event => {
  // السيطرة على العميل فوراً
  self.clients.claim();
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // حذف الكاش القديم
            console.log('حذف الكاش القديم:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        }).filter(Boolean)
      );
    })
  );
});
