// اسم ملفات الـ Cache
const CACHE_NAME = 'ai8v-cache-v1';

// قائمة الملفات التي سيتم تخزينها في الـ Cache
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/bootstrap/css/bootstrap.min.css',
  '/assets/bootstrap/js/bootstrap.min.js',
  '/assets/css/bs-theme-overrides.css',
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

// تثبيت Service Worker وتخزين الملفات في الـ Cache
self.addEventListener('install', event => {
  console.log('تثبيت Service Worker...');
  
  // تأجيل إنهاء حدث التثبيت حتى اكتمال الوعد
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم فتح الـ Cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('تم تخزين جميع الموارد في الـ Cache');
        return self.skipWaiting(); // تخطي مرحلة الانتظار وتفعيل Service Worker فورًا
      })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('تفعيل Service Worker...');

  // إزالة الـ caches القديمة
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('إزالة الـ Cache القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker نشط الآن');
      return self.clients.claim(); // المطالبة بالتحكم في جميع الصفحات المفتوحة
    })
  );
});

// استراتيجية Cache First ثم Network
self.addEventListener('fetch', event => {
  // الخروج فورًا إذا كان الطلب لملف robots.txt أو sitemap.xml
  // هذا سيضمن أن هذه الملفات دائمًا تُجلب من الخادم وليس من الكاش
  const url = new URL(event.request.url);
  if (url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml') {
    return;
  }

  // عدم التداخل مع محركات البحث وروبوتات الزحف
  const userAgent = event.request.headers.get('User-Agent') || '';
  if (userAgent.includes('Googlebot') || 
      userAgent.includes('bingbot') || 
      userAgent.includes('YandexBot') || 
      userAgent.includes('Baiduspider')) {
    // عدم التداخل مع طلبات روبوتات محركات البحث
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إرجاع الملف من الـ Cache إذا وجد
        if (response) {
          return response;
        }

        // إذا لم يكن موجودًا في الـ Cache، فسنقوم بجلبه من الشبكة
        return fetch(event.request)
          .then(networkResponse => {
            // التحقق من أن الاستجابة صالحة
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // نسخ الاستجابة لأن الـ body يمكن استخدامه مرة واحدة فقط
            const responseToCache = networkResponse.clone();

            // إضافة الملف إلى الـ Cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          });
      })
      .catch(() => {
        // في حالة فشل الاتصال بالشبكة، يمكن إرجاع صفحة خطأ مخصصة أو صفحة دون اتصال
        // للتبسيط، سنرجع إلى الصفحة الرئيسية إذا كان الطلب لصفحة HTML
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        // في حالة طلب موارد أخرى، يمكن ترك الخطأ يحدث
        return new Response('حدث خطأ في الاتصال بالإنترنت', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

// التعامل مع إشعارات الدفع (Push Notifications)
self.addEventListener('push', event => {
  console.log('تم استلام إشعار:', event.data.text());
  
  const options = {
    body: event.data.text(),
    icon: '/assets/img/android-chrome-192x192.png',
    badge: '/assets/img/favicon-32x32.png',
    dir: 'rtl', // اتجاه النص من اليمين إلى اليسار
    vibrate: [100, 50, 100], // نمط الاهتزاز
    data: {
      url: self.location.origin // عنوان URL للنقر على الإشعار
    }
  };

  event.waitUntil(
    self.registration.showNotification('Ai8V | Eight Vegetables', options)
  );
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});