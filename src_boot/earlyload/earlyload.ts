(async () => {
    console.log('ModI18N earlyload start');

    window.modSC2DataManager.getSc2EventTracer().addCallback({
        // @ts-ignore
        modName: "ModI18N",
        whenSC2PassageEnd: (passage: any, content: HTMLDivElement) => {
            // console.log('ModI18N earlyload whenSC2PassageEnd', passage, content);
            if (!window.modSC2DataManager.getModLoader().getModZip('ModI18N')?.gcIsReleased()) {
                window.modSC2DataManager.getModLoader().getModZip('ModI18N')?.gcReleaseZip();
            }
        },
    });

    await window.modI18N.readZipStream();
})();
