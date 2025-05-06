if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ تم تسجيل Service Worker بنجاح:', registration.scope);

        // تحديث تلقائي
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('❌ فشل تسجيل Service Worker:', error);
        
        // محاولة إعادة التسجيل مع مسار مختلف للتشخيص
        if (location.hostname !== 'localhost' && location.protocol === 'https:') {
          console.log('محاولة تسجيل Service Worker مع مسار مطلق...');
          const swUrl = new URL('/sw.js', window.location.origin).href;
          console.log('المسار المطلق:', swUrl);
          
          navigator.serviceWorker.register(swUrl)
            .then(reg => console.log('✅ تم التسجيل بالمسار المطلق:', reg.scope))
            .catch(err => console.log('❌ فشل التسجيل بالمسار المطلق:', err));
        }
      });

    // إعادة تحميل الصفحة بعد التحديث
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
