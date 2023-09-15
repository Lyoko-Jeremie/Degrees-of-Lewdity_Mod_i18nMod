(async () => {
    console.log('ModI18N earlyload start');

    window.modI18N = new ModI18N();

    return window.modI18N.readZipSelf();
})();
