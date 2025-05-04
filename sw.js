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
  '/assets/js/script.js'
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
      .catch(error => {
        console.error('فشل في تخزين الملفات في الـ Cache:', error);
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

// استراتيجية Cache First ثم Network - مع تحسينات للتعامل مع أنواع المحتوى المختلفة
self.addEventListener('fetch', event => {
  // التحقق من صلاحية الطلب
  if (!event.request || !event.request.url) {
    return;
  }

  const url = new URL(event.request.url);
  
  // عدم التدخل مع بعض أنواع الطلبات المحددة - خاصة للملفات الخاصة بالروبوتات وأي ملفات XML تشبه RSS
  if (
    url.pathname === '/robots.txt' || 
    url.pathname === '/sitemap.xml' || 
    url.pathname.endsWith('.xml') || 
    url.pathname.endsWith('/feed') || 
    url.pathname.includes('/rss') || 
    url.pathname.includes('/feed')
  ) {
    return;
  }

  // عدم التدخل مع inject-root-bundle.js أو أي ملفات تتعلق بـ RSS
  if (
    url.pathname.includes('inject-root-bundle.js') || 
    url.pathname.includes('RSS_Basic_Detect.js')
  ) {
    return;
  }

  // عدم التداخل مع محركات البحث وروبوتات الزحف
  const userAgent = event.request.headers.get('User-Agent') || '';
  if (userAgent.includes('Googlebot') || 
      userAgent.includes('bingbot') || 
      userAgent.includes('YandexBot') || 
      userAgent.includes('Baiduspider')) {
    return;
  }

  // تجاهل طلبات عبر النطاقات المختلفة إلا إذا كانت مذكورة في قائمة الكاش
  const isSameOrigin = url.origin === self.location.origin;
  const isInCacheList = urlsToCache.some(cacheUrl => {
    // تحويل نسبي URL إلى مطلق للمقارنة
    const absoluteCacheUrl = new URL(cacheUrl, self.location.origin).href;
    return absoluteCacheUrl === event.request.url;
  });
  
  // تجاهل التعامل مع أي طلب يحتوي على "contentType" في المسار أو البارامترات
  if (
    url.pathname.includes('contentType') || 
    url.search.includes('contentType')
  ) {
    return;
  }

  // تعامل مع الطلبات التي هي من نفس النطاق أو مدرجة في قائمة الكاش
  if (isSameOrigin || isInCacheList) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // إرجاع الملف من الـ Cache إذا وجد
          if (response) {
            return response;
          }

          // إذا لم يكن موجودًا في الـ Cache، فسنقوم بجلبه من الشبكة
          return fetch(event.request.clone())
            .then(networkResponse => {
              // التحقق من أن الاستجابة صالحة
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }

              try {
                // نسخ الاستجابة لأن الـ body يمكن استخدامه مرة واحدة فقط
                const responseToCache = networkResponse.clone();

                // تخزين في الكاش فقط للطلبات من نفس الأصل أو المحددة في قائمة الكاش
                // تأكد من أن الاستجابة تحتوي على نوع محتوى يمكن تخزينه
                const contentType = networkResponse.headers.get('content-type');
                const isTextOrDataResponse = !contentType || 
                  contentType.includes('text/') || 
                  contentType.includes('application/javascript') || 
                  contentType.includes('application/json') || 
                  contentType.includes('image/') || 
                  contentType.includes('font/') || 
                  contentType.includes('application/font');

                if ((isSameOrigin || isInCacheList) && isTextOrDataResponse) {
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                    })
                    .catch(error => {
                      console.error('خطأ في تخزين الاستجابة في الكاش:', error);
                    });
                }
              } catch (error) {
                console.error('حدث خطأ أثناء معالجة الاستجابة:', error);
              }

              return networkResponse;
            })
            .catch(error => {
              console.error('خطأ في جلب الملف من الشبكة:', error);
              
              // في حالة طلب صفحة HTML وعدم توفر اتصال، إرجاع الصفحة الرئيسية من الكاش
              if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
              }
              
              // إرجاع رسالة خطأ لأنواع الطلبات الأخرى
              return new Response('حدث خطأ في الاتصال بالإنترنت', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain; charset=UTF-8'
                })
              });
            });
        })
    );
  }
});

// التعامل مع إشعارات الدفع (Push Notifications)
self.addEventListener('push', event => {
  console.log('تم استلام إشعار:', event.data ? event.data.text() : 'بدون محتوى');
  
  const options = {
    body: event.data ? event.data.text() : 'إشعار جديد',
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
