// إصدار الكاش، يمكنك تغييره عند تحديث موقعك
const CACHE_NAME = 'ai8v-cache-v1';

// قائمة الملفات التي ترغب في تخزينها محلياً
const urlsToCache = [
  '/',
  '/index.html',
  '/thank-you.html',
  '/assets/bootstrap/css/bootstrap.min.css',
  '/assets/css/style.css',
  '/assets/fonts/fontawesome-all.min.css',
  '/assets/img/apple-touch-icon.png',
  '/assets/img/favicon-16x16.png',
  '/assets/img/favicon-16x16-Dark.png',
  '/assets/img/favicon-32x32.png',
  '/assets/img/favicon-32x32-Dark.png',
  '/assets/img/android-chrome-192x192.png',
  '/assets/img/android-chrome-512x512.png',
  // أضف هنا أي ملفات إضافية ترغب في تخزينها مسبقاً
];

// تثبيت Service Worker وتخزين الملفات
self.addEventListener('install', event => {
  // تنفيذ عملية التثبيت بشكل فوري ودون انتظار
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم فتح الكاش بنجاح');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('فشل في تخزين الملفات في الكاش:', error);
      })
  );
});

// استراتيجية خدمة الطلبات: محاولة الكاش أولاً، ثم الشبكة (Cache First)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // إذا وجد استجابة في الكاش، قم بإرجاعها
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // إذا لم تجد في الكاش، اذهب للشبكة
        return fetch(event.request)
          .then(response => {
            // تخزين في الكاش فقط إذا كان طلب GET وناجح
            if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
              return response;
            }

            // تخزين نسخة في الكاش
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('فشل في تخزين الاستجابة في الكاش:', error);
              });

            return response;
          })
          .catch(error => {
            console.error('فشل جلب البيانات من الشبكة:', error);
            
            // يمكن إضافة استجابة احتياطية هنا لصفحات معينة
            if (event.request.url.includes('html')) {
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
        })
      );
    })
  );
});
