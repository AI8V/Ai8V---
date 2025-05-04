// التحقق من دعم المتصفح للـ Service Worker
if ('serviceWorker' in navigator) {
  // الانتظار حتى يتم تحميل الصفحة
  window.addEventListener('load', function() {
    // تسجيل Service Worker
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('Service Worker تم تسجيله بنجاح، النطاق: ', registration.scope);
      })
      .catch(function(error) {
        console.log('فشل تسجيل Service Worker، الخطأ: ', error);
      });
  });
}