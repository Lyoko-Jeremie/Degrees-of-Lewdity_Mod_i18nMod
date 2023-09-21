(() => {

    // window.modI18N.patchVersionString();

    // @ts-ignore
    window.jQuery(document).one(":passageinit", () => {
        console.log('i18n patchVersionString');
        window.modI18N.patchVersionString();
    });
})();
