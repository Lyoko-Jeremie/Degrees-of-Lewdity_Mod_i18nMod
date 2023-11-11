/// <reference path="../../../dist-BeforeSC2/SC2DataManager.d.ts" />
/// <reference path="../../../dist-BeforeSC2/Utils.d.ts" />
/// <reference path="../../../dist-BeforeSC2/ModLoader.d.ts" />
/// <reference path="./winDef.d.ts" />

// 因为 @streamparser/json 无法正常工作，所以我这里改成了这样
import {JSONParser} from "../node_modules/@streamparser/json/dist/mjs/index.js";//@streamparser/json
import {TypeBOutputText, TypeBInputStoryScript, ModI18NTypeB} from "./TypeB";

export class ModI18N {
    modUtils = window.modUtils;
    modSC2DataManager = window.modSC2DataManager;

    _ = window.modUtils.getLodash();
    logger;

    constructor() {
        this.logger = this.modUtils.getLogger();
    }


    checkItem(t: any): t is TypeBInputStoryScript{
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

        const selfZip = this.modSC2DataManager.getModLoader().getModZip('ModI18N');
        if (selfZip) {
            if (selfZip.modInfo && selfZip.modInfo.version) {
                StartConfig.version = `${StartConfig.version}-(chs-${selfZip.modInfo.version})`;
            }
        }
    }


    async readZipStream() {
        this.logger.log('patching i18n mod ........');
        const selfZip = this.modSC2DataManager.getModLoader().getModZip('ModI18N');

        if (selfZip) {

            const parser = new JSONParser({
                stringBufferSize: 1024,
                keepStack: false,
                paths: ['$.typeB.TypeBOutputText.*', '$.typeB.TypeBInputStoryScript.*']
            });
            let resultB : TypeBOutputText[]= [];
            let resultBInput : TypeBInputStoryScript[] = [];

            var maxusage = 0;
            parser.onValue = ({value, key, parent, stack}) => {
                if(stack.length < 2) return;
                if (stack[2].key === 'TypeBOutputText'){
                    if (this.checkItem(value)) {
                        resultB.push({
                            // @ts-ignore
                            from: value.f,
                            // @ts-ignore
                            to: value.t,
                            // @ts-ignore
                            pos: value.pos,
                            fileName: value.fileName,
                            js: value.js
                        });
                    }
                }
                else if(stack[2].key === 'TypeBInputStoryScript')
                {
                    if (this.checkItem(value)) {
                        resultBInput.push({
                            // @ts-ignore
                            from: value.f,
                            // @ts-ignore
                            to: value.t,
                            // @ts-ignore
                            pos: value.pos,
                            fileName: value.fileName,
                            // @ts-ignore
                            passageName: value.pN
                        });
                    }
                }
                if (parent !== undefined) {
                    //console.log(parent.length);
                    //const used = process.memoryUsage().heapUsed / 1024 / 1024;
                    //if (used > maxusage)
                    //    maxusage = used;
                    parent.length = 0;
                }
            };
            const zipStream = selfZip.zip.file('i18n.json')?.async("string").then((content : string) => {
                parser.write(content);
            });
            await zipStream;
            //.pipe(JSONStream.parse(['typeB', '']))

            this.typeB = new ModI18NTypeB(resultB, resultBInput);

            this.startReplace();
        }
    }

    private startReplace()
    {
        if (this.typeB === undefined) return;
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

    async readZipSelf() {

        this.logger.log('patching i18n mod ........');
        const selfZip = this.modSC2DataManager.getModLoader().getModZip('ModI18N');

        if (selfZip) {
            // load i18n.json from mod zip file
            const i18nJsonS = await selfZip.zip.file('i18n.json')?.async('string').catch((err: any) => {
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

                this.startReplace();
            }

        } else {
            console.error('I18NMod cannot read zip self');
            this.logger.error('I18NMod cannot read zip self');
        }
    }

    typeB?: ModI18NTypeB;
}



