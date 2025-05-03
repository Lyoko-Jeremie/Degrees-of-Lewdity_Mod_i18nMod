import type {SC2DataManager} from '../../../dist-BeforeSC2/SC2DataManager';
import type {ModUtils} from '../../../dist-BeforeSC2/Utils';
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import {ModZipReader, ModZipReaderHash} from "../../../dist-BeforeSC2/ModZipReader";
import type {IdbRef, IdbKeyValRef} from "../../../dist-BeforeSC2/IdbKeyValRef";
import type {SC2DataInfo, SC2DataInfoCache} from "../../../dist-BeforeSC2/SC2DataInfoCache";

import {JSONParser} from "@streamparser/json";
import {TypeBOutputText, TypeBInputStoryScript, ModI18NTypeB, TypeBI18NInputType} from "./TypeB";
import JSZip, {JSZipStreamHelper} from "jszip";
import {assert, is} from 'tsafe';


export function sleep(ms: number = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class ModI18N {
    modUtils: ModUtils = window.modUtils;
    modSC2DataManager: SC2DataManager = window.modSC2DataManager;

    _ = window.modUtils.getLodash();
    logger: LogWrapper;

    idbRef: IdbRef;
    idbKeyValRef: IdbKeyValRef;

    constructor() {
        this.logger = this.modUtils.getLogger();
        this.idbRef = this.modUtils.getIdbRef();
        this.idbKeyValRef = this.modUtils.getIdbKeyValRef();
    }


    checkItem(t: any): t is TypeBI18NInputType {
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

        const selfZip: ModZipReader | undefined = this.modSC2DataManager.getModLoader().getModZip('ModI18N');
        if (selfZip) {
            // console.log('[i18n] selfZip.modInfo', selfZip.modInfo);
            // console.log('[i18n] StartConfig', StartConfig);
            if (selfZip.modInfo && selfZip.modInfo.version) {
                // StartConfig.version = `${StartConfig.version}-(chs-${selfZip.modInfo.version})`;
                StartConfig.versionName = `${StartConfig.versionName}-(chs-${selfZip.modInfo.version})`;
            }
        }
    }


    async readZipStream() {
        this.logger.log('patching i18n mod...');
        const selfZip = this.modSC2DataManager.getModLoader().getModZip('ModI18N');

        if (!selfZip) {
            this.logger.log('ModI18N zip not found');
            return;
        }

        // 获取mod的hash用于版本校验
        const currentHash = selfZip.modZipReaderHash;
        const cachedData = await this.I18NGetFromIDB(currentHash);

        if (cachedData) {
            this.logger.log('Using cached i18n data');
            this.typeB = new ModI18NTypeB(cachedData.resultB, cachedData.resultBInput);
        } else {
            await this.I18NCleanCache();
            // 缓存未命中,使用原始解析方法
            this.logger.log('Cache miss, parsing i18n data...');
            const {resultB, resultBInput} = await this.parseOriginalZip(selfZip);

            await this.I18NSaveToIDB({
                hash: currentHash.toString(),
                resultB,
                resultBInput
            });

            this.typeB = new ModI18NTypeB(resultB, resultBInput);
        }

        this.logger.log('Starting replace...');
        await sleep(10);
        await this.startReplace();

        this.modSC2DataManager.getLanguageManager().mainLanguage = 'zh';

        this.logger.log('[i18n] cacheing image');
        for (const img of selfZip.modInfo!.imgs) {
            // force load banner and other image , to avoid read error after release zip file
            await img.getter.forceCache();
        }

        // 释放zip
        selfZip.gcReleaseZip();
        this.typeB.destroy();
        this.typeB = undefined;
        this.logger.log('GC complete');

        this.logger.log('I18n patch complete');
        await sleep(10);
    }

    // 原始zip解析方法
    private async parseOriginalZip(selfZip: any) {
        const parser = new JSONParser({
            stringBufferSize: 1024,
            keepStack: false,
            paths: ['$.typeB.TypeBOutputText.*', '$.typeB.TypeBInputStoryScript.*']
        });

        let resultB: TypeBOutputText[] = [];
        let resultBInput: TypeBInputStoryScript[] = [];

        var maxusage = 0;
        parser.onValue = ({value, key, parent, stack}) => {
            if (stack.length < 2) return;
            if (stack[2].key === 'TypeBOutputText') {
                if (this.checkItem(value)) {
                    resultB.push({
                        from: value.f,
                        to: value.t,
                        pos: value.pos,
                        fileName: value.fileName,
                        js: value.js,
                    });
                }
            } else if (stack[2].key === 'TypeBInputStoryScript') {
                if (this.checkItem(value)) {
                    assert(!!value.pN, 'pN must exist if it is TypeBInputStoryScript.');
                    resultBInput.push({
                        from: value.f,
                        to: value.t,
                        pos: value.pos,
                        fileName: value.fileName,
                        passageName: value.pN,
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

        //internalStream 在ts注解里面不存在，但是实际上是有这个方法的
        const logger = this.logger;
        var previousPercent: number = 0;
        const stream: JSZipStreamHelper<string> = selfZip.zip.file("i18n.json")?.internalStream("string");
        const promise = new Promise(function (resolve, reject) {
            stream
                .on('data', function (dataChunk, metadata) {
                    var floorValue = Math.floor(metadata.percent);
                    if (previousPercent !== floorValue) {
                        previousPercent = floorValue;
                        if ((previousPercent % 10) === 0) {
                            logger.log('[i18n] Loading...... ' + floorValue);
                        }
                    }
                    parser.write(dataChunk);
                })
                .on("error", function (err) {
                    reject(err);
                })
                .on("end", function () {
                    try {
                        resolve(0);
                    } catch (e) {
                        reject(e);
                    }
                })
                .resume();
        });
        await promise;

        return {resultB, resultBInput};
    }

    // IndexedDB操作方法
    private async I18NGetFromIDB(hash: ModZipReaderHash) {
        const hashKey = hash.toString();
        const db = await this.idbRef.idb_openDB('i18n-cache', 1, {
            upgrade(db) {
                db.createObjectStore('translations', {keyPath: 'hash'});
            },
        });

        const cached = await db.get('translations', hashKey);
        db.close();
        return cached;
    }

    private async I18NSaveToIDB(data: any) {
        const db = await this.idbRef.idb_openDB('i18n-cache', 1);
        await db.put('translations', data);
        db.close();
    }

    private async I18NCleanCache() {
        const db = await this.idbRef.idb_openDB('i18n-cache', 1);
        await db.clear('translations');
        db.close();
    }


    private async startReplace() {
        if (this.typeB === undefined) return;
        // start replace
        const sc2DataCache: SC2DataInfoCache = this.modSC2DataManager.getSC2DataInfoAfterPatch();
        // console.log('i18nJson sc2DataCache', sc2DataCache);
        const sc2Data: SC2DataInfo = sc2DataCache.cloneSC2DataInfo();
        // console.log('i18nJson sc2Data', sc2Data);

        this.logger.log('[i18n] replace style ... ');
        await sleep(10);
        for (const styleItem of sc2Data.styleFileItems.items) {
          const name = sc2Data.scriptFileItems.getNoPathNameFromString(styleItem.name);
          styleItem.content = this.typeB.replaceCss(styleItem.content, name);
        }
        
        this.logger.log('[i18n] replace script ... ');
        await sleep(10);
        for (const scriptItem of sc2Data.scriptFileItems.items) {
          const name = sc2Data.scriptFileItems.getNoPathNameFromString(scriptItem.name);
          scriptItem.content = this.typeB.replaceJs(scriptItem.content, name);
        }

        this.logger.log('[i18n] replace passage ... ');
        await sleep(10);
        for (const passageDataItem of sc2Data.passageDataItems.items) {
          const name = sc2Data.scriptFileItems.getNoPathNameFromString(passageDataItem.name);
          passageDataItem.content = this.typeB.replaceInputStoryScript(passageDataItem.content, name);
        }

        this.logger.log('[i18n] rebuilding ... ');
        await sleep(10);

        console.log('sc2DataCache', sc2DataCache);
        console.log('sc2Data', sc2Data);

        sc2Data.styleFileItems.fillMap();
        sc2Data.scriptFileItems.fillMap();
        sc2Data.passageDataItems.fillMap();
        
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

                await this.startReplace();

                this.modSC2DataManager.getLanguageManager().mainLanguage = 'zh';
            }

        } else {
            console.error('I18NMod cannot read zip self');
            this.logger.error('I18NMod cannot read zip self');
        }
    }

    typeB?: ModI18NTypeB;
}



