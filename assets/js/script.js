// التحقق من دعم Service Worker
if ('serviceWorker' in navigator) {
  // إضافة مكتبة Bootstrap Icons للأيقونات
  const iconLink = document.createElement('link');
  iconLink.rel = 'stylesheet';
  iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css';
  document.head.appendChild(iconLink);

  // عناصر واجهة المستخدم
  let pwaStatus, onlineStatus, offlineStatus, installButton, cacheStatus, updateButton;

  // عند تحميل الصفحة
  window.addEventListener('load', () => {
    // تعريف عناصر واجهة المستخدم
    pwaStatus = document.getElementById('pwa-status');
    onlineStatus = document.getElementById('online-status');
    offlineStatus = document.getElementById('offline-status');
    installButton = document.getElementById('install-button');
    cacheStatus = document.getElementById('cache-status');
    updateButton = document.getElementById('update-button');

    // تسجيل Service Worker
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('تم تسجيل Service Worker بنجاح:', registration.scope);
        pwaStatus.innerHTML = `
          <div class="alert alert-success mb-0">
            <div class="d-flex">
              <div class="me-3">
                <i class="bi bi-check-circle-fill fs-1"></i>
              </div>
              <div>
                <h5 class="alert-heading">تم تفعيل التطبيق بنجاح</h5>
                <p class="mb-0">يمكنك الآن استخدام التطبيق بدون إنترنت</p>
              </div>
            </div>
          </div>
        `;

        // عرض حالة الاتصال بالإنترنت
        updateOnlineStatus();

        // التحقق من تحديثات Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // يوجد تحديث جديد
              updateButton.classList.add('btn-warning');
              updateButton.textContent = 'تثبيت التحديث';
            }
          });
        });

        // تحديث تاريخ آخر تحديث
        const lastUpdateDate = localStorage.getItem('sw-last-update') || new Date().toLocaleString('ar-EG');
        cacheStatus.textContent = `آخر تحديث: ${lastUpdateDate}`;
      })
      .catch(error => {
        console.error('فشل في تسجيل Service Worker:', error);
        pwaStatus.innerHTML = `
          <div class="alert alert-danger mb-0">
            <div class="d-flex">
              <div class="me-3">
                <i class="bi bi-exclamation-triangle-fill fs-1"></i>
              </div>
              <div>
                <h5 class="alert-heading">حدث خطأ في تفعيل التطبيق</h5>
                <p class="mb-0">لا يمكن استخدام التطبيق بدون إنترنت</p>
              </div>
            </div>
          </div>
        `;
      });

    // معالجة حدث تحديث التطبيق
    updateButton.addEventListener('click', () => {
      if (navigator.serviceWorker.controller) {
        // إعادة تحميل الصفحة لتفعيل التحديث
        window.location.reload();
        // تحديث تاريخ آخر تحديث
        localStorage.setItem('sw-last-update', new Date().toLocaleString('ar-EG'));
      }
    });

    // مراقبة حالة الاتصال بالإنترنت
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  });

  // دالة تحديث حالة الاتصال في الواجهة
  function updateOnlineStatus() {
    if (navigator.onLine) {
      onlineStatus.classList.remove('d-none');
      offlineStatus.classList.add('d-none');
    } else {
      onlineStatus.classList.add('d-none');
      offlineStatus.classList.remove('d-none');
    }
  }

  // معالجة حدث تثبيت التطبيق على الجهاز
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    // منع ظهور نافذة التثبيت التلقائية
    e.preventDefault();
    // تخزين الحدث لاستخدامه لاحقًا
    deferredPrompt = e;
    // إظهار زر التثبيت
    if (installButton) {
      installButton.classList.remove('d-none');
      installButton.addEventListener('click', () => {
        // إظهار نافذة التثبيت
        deferredPrompt.prompt();
        // متابعة خيار المستخدم
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('تم تثبيت التطبيق');
            installButton.classList.add('d-none');
          }
          deferredPrompt = null;
        });
      });
    }
  });
}
