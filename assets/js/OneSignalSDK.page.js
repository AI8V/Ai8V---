window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "43de9a9a-f37f-40b8-a1d8-30e3c88caa51",
      safari_web_id: "web.onesignal.auto.092506a7-b452-4a06-a822-c1d343884087",
        serviceWorkerPath: "./OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: './' },
      notifyButton: {
        enable: true,
      },
    });
  });