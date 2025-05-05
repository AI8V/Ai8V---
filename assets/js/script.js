
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    
    // تسجيل Service Worker الخاص بالموقع فقط للـ PWA
    navigator.serviceWorker.getRegistration().then(reg => {
      // تحقق مما إذا كان هناك بالفعل service worker مسجل
      if (!reg || (reg && !reg.active)) {
        setTimeout(() => {
          navigator.serviceWorker.register('/sw.js', { scope: '/' })
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
        }, 3000); // انتظر 3 ثوانٍ للتأكد من تهيئة OneSignal أولاً
      }
    });

    // إعادة تحميل الصفحة بعد التحديث
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
