(() => {

    // window.modI18N.patchVersionString();

    window.jQuery(document).one(":passageinit", () => {
        console.log('i18n patchVersionString');
        window.modI18N.patchVersionString();
    });

    // const styleNode = document.querySelector<HTMLStyleElement>('#style-module-base');
    // if (!styleNode) {
    //     console.error('cannot find #style-module-base');
    //     return;
    // }
    // let style = styleNode.innerHTML;
    // style = style.replace('max-height: 2.4em;', 'max-height: 7em;');
    // style = style.replace('content: " months";', 'content: " 月数";');
    // style = style.replace('content: " weeks";', 'content: " 周数";');
    // styleNode.innerHTML = style;

})();
