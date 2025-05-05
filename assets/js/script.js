// تحديث ملف script.js - لضمان عدم التعارض مع OneSignal

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // تأكد من أن OneSignal جاهز قبل تسجيل الـ Service Worker الخاص بك
    if (window.OneSignal && window.OneSignal.initialized) {
      // OneSignal سيتعامل مع تسجيل Service Worker
      console.log('✅ تم تفويض تسجيل Service Worker إلى OneSignal');
    } else {
      // ننتظر قليلاً للتأكد من أن OneSignal قد تم تهيئته
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('✅ تم تسجيل Service Worker بنجاح:', registration.scope);
    
            // تحديث تلقائي
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
    
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            });
          })
          .catch((error) => {
            console.log('❌ فشل تسجيل Service Worker:', error);
          });
      }, 2000); // انتظر 2 ثانية للتأكد من تهيئة OneSignal
    }

    // إعادة تحميل الصفحة بعد التحديث
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
