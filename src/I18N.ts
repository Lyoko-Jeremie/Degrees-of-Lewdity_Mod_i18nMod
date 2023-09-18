/// <reference path="../../../dist-BeforeSC2/SC2DataManager.d.ts" />
/// <reference path="../../../dist-BeforeSC2/Utils.d.ts" />
/// <reference path="./winDef.d.ts" />


class ModI18N {

    modUtils = window.modUtils;
    modSC2DataManager = window.modSC2DataManager;

    constructor() {
    }

    private checkAndProcessData(T: any): [TypeBOutputText[], TypeBInputStoryScript[]] | undefined {
        if (T && T.typeB && T.typeB.TypeBOutputText && T.typeB.TypeBInputStoryScript) {
            const cacheTypeBOutputText = T.typeB.TypeBOutputText.map((T: any) => {
                return Object.assign(T, {
                    from: T.f,
                    to: T.t,
                });
            });
            const cacheTypeBInputStoryScript = T.typeB.TypeBInputStoryScript.map((T: any): TypeBInputStoryScript => {
                return Object.assign(T, {
                    from: T.f,
                    to: T.t,
                    passageName: T.pN,
                } as TypeBInputStoryScript);
            });

            return [cacheTypeBOutputText, cacheTypeBInputStoryScript];
        }
        return undefined;
    }

    async readZipSelf() {
        // const ogrinPassageData = structuredClone(this.modSC2DataManager.getSC2DataInfoAfterPatch().passageDataItems.items);

        const zips = this.modSC2DataManager.getModLoader().getModZip('ModI18N');
        if (zips && zips.length > 0) {

            let selfZip;
            for (let i = 0; i < zips.length; i++) {
                const zip = zips[i];
                const info = zip.getModInfo();
                console.log(' bootJson :', [info?.bootJson]);
                if (info?.bootJson?.addstionFile.find(T => T === 'i18n.json')) {
                    selfZip = zip;
                    break;
                }
            }
            if (selfZip) {
                // load i18n.json from mod zip file
                const i18nJsonS = await selfZip.getZipFile().file('i18n.json')?.async('string').catch((err: any) => {
                    console.error(err);
                    return undefined;
                });
                if (i18nJsonS) {
                    let i18nJson;
                    try {
                        i18nJson = JSON.parse(i18nJsonS);
                    } catch (e) {
                        console.error(e);
                    }
                    console.log('i18nJson', i18nJson);
                    const cc = this.checkAndProcessData(i18nJson);
                    if (!cc) {
                        console.error('I18NMod checkAndProcessData (!cc)');
                        return;
                    }
                    this.typeB = new ModI18NTypeB(cc[0], cc[1]);

                    // start replace
                    const sc2DataCache = this.modSC2DataManager.getSC2DataInfoAfterPatch();
                    // console.log('i18nJson sc2DataCache', sc2DataCache);
                    const sc2Data = sc2DataCache.cloneSC2DataInfo();
                    // console.log('i18nJson sc2Data', sc2Data);

                    for (const T of sc2Data.styleFileItems.items) {
                        T.content = this.typeB.replaceCss(T.content, T.name);
                    }
                    for (const T of sc2Data.scriptFileItems.items) {
                        T.content = this.typeB.replaceJs(T.content, T.name);
                    }

                    for (const pd of sc2Data.passageDataItems.items) {
                        pd.content = this.typeB.replaceInputStoryScript(pd.content, pd.name);
                    }

                    console.log('sc2DataCache', sc2DataCache);
                    console.log('sc2Data', sc2Data);
                    this.modUtils.replaceFollowSC2DataInfo(sc2Data, sc2DataCache);

                }
            }
        } else {
            console.log('I18NMod cannot read zip self');
        }
    }

    typeB?: ModI18NTypeB;
}



