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
              console.log('حالة Service Worker الجديد:', newWorker.state);
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('تم تثبيت Service Worker الجديد، جاري إرسال رسالة SKIP_WAITING');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('❌ فشل تسجيل Service Worker:', error.message);
        console.error('تفاصيل الخطأ:', error);
        
        // محاولة التشخيص
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          console.warn('⚠️ لا يمكن تسجيل Service Worker دون HTTPS');
        }
      });
    
    // إعادة تحميل الصفحة بعد التحديث
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('⚡ تم تحديث Service Worker، جاري إعادة تحميل الصفحة');
        window.location.reload();
      }
    });
  });
}
