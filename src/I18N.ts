/// <reference path="../../../dist-BeforeSC2/SC2DataManager.d.ts" />
/// <reference path="../../../dist-BeforeSC2/Utils.d.ts" />
/// <reference path="../../../dist-BeforeSC2/ModLoader.d.ts" />
/// <reference path="./winDef.d.ts" />

class ModI18N {
    modUtils = window.modUtils;
    modSC2DataManager = window.modSC2DataManager;

    _ = window.modUtils.getLodash();
    logger;

    constructor() {
        this.logger = this.modUtils.getLogger();
    }


    checkItem(t: TypeBInputStoryScript) {
        let c = t
            && this._.isString(this._.get(t, 'f'))
            && this._.isString(this._.get(t, 't'))
            && this._.isNumber(this._.get(t, 'pos'));
        if (t.passageName) {
            c = c && this._.isString(t.passageName);
        }
        if (this._.has(t, 'pN')) {
            c = c && this._.isString(this._.get(t, 'pN'));
        }
        if (t.css || t.js) {
            c = c && this._.isString(t.fileName);
        }
        // console.log('checkItem', [c, [
        //     this._.isString(this._.get(t, 'f')),
        //     this._.isString(this._.get(t, 't')),
        //     this._.isNumber(this._.get(t, 'pos')),
        //     t.passageName ? this._.isString(t.passageName) : true,
        //     this._.has(t, 'pN') ? this._.isString(this._.get(t, 'pN')) : true,
        //     t.css || t.js ? this._.isString(t.fileName) : true,
        // ]]);
        return c;
    }

    private checkAndProcessData(T: any): [TypeBOutputText[], TypeBInputStoryScript[]] | undefined {
        if (T && T.typeB && T.typeB.TypeBOutputText && T.typeB.TypeBInputStoryScript) {
            const cacheTypeBOutputText = T.typeB.TypeBOutputText.map((T: any) => {
                if (!this.checkItem(T)) {
                    console.error('I18NMod checkAndProcessData TypeBOutputText (!this.checkItem(T))', T);
                }
                return Object.assign(T, {
                    from: T.f,
                    to: T.t,
                });
            });
            const cacheTypeBInputStoryScript = T.typeB.TypeBInputStoryScript.map((T: any): TypeBInputStoryScript => {
                if (!this.checkItem(T)) {
                    console.error('I18NMod checkAndProcessData TypeBInputStoryScript (!this.checkItem(T))', T);
                }
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

    patchVersionString() {

        const zips = this.modSC2DataManager.getModLoader().getModZip('ModI18N');
        if (zips && zips.length > 0) {

            let selfZip;
            for (let i = 0; i < zips.length; i++) {
                const zip = zips[i];
                const info = zip.getModInfo();
                console.log(' bootJson :', [info?.bootJson]);
                if (info?.bootJson?.additionFile.find(T => T === 'i18n.json')) {
                    selfZip = zip;
                    break;
                }
            }
            if (selfZip) {
                if (selfZip.modInfo && selfZip.modInfo.version) {
                    StartConfig.version = `${StartConfig.version}-(chs-${selfZip.modInfo.version})`;
                }
            }
        }
    }

    async readZipSelf() {
        // const ogrinPassageData = structuredClone(this.modSC2DataManager.getSC2DataInfoAfterPatch().passageDataItems.items);

        const imgs = this.modSC2DataManager.getModLoader().getMod('ModI18N')?.imgs;

        this.logger.log('patching i18n mod ........');
        const zips = this.modSC2DataManager.getModLoader().getModZip('ModI18N');
        if (zips && zips.length > 0) {

            let selfZip;
            for (let i = 0; i < zips.length; i++) {
                const zip = zips[i];
                const info = zip.getModInfo();
                console.log(' bootJson :', [info?.bootJson]);
                if (info?.bootJson?.additionFile.find(T => T === 'i18n.json')) {
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

                // hook banner img
                this.modSC2DataManager.getHtmlTagSrcHook().addHook('i18n_CN_Banner',
                    async (el: HTMLImageElement | HTMLElement, mlSrc: string) => {
                        if (!imgs) {
                            return false;
                        }
                        if (mlSrc === 'img/misc/banner.png') {
                            const n = imgs.find(T => T.path === 'banner_cn.png');
                            if (n) {
                                el.setAttribute('src', await n.getter.getBase64Image());
                                return true;
                            }
                            this.logger.warn('i18n_CN_Banner cannot find banner img');
                        }
                        return false;
                    }
                );
            }
        } else {
            console.log('I18NMod cannot read zip self');
        }
    }

    typeB?: ModI18NTypeB;
}



