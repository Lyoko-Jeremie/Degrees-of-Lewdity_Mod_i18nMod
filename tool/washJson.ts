import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {has, isString, get} from 'lodash';

interface TTTT {
    debugMsg?: string;
    from?: string;
    to?: string;
    f?: string;
    t?: string;
    // dont prepare trim `from: string`, means the `from: string` is already trimed, trim will call `.trim().replace('[\n\r]', ' ')`
    dontPrepareTrim?: boolean;
    // dont trim input string before match, trim will call `.trim().replace('[\n\r]', ' ')`
    // this will split matcher to 2 type
    dontTrim?: boolean;
    // dont match some string, avoid replace some siminar string
    notMatchRegex?: string;
    // dont trim empty from input string `AAA <<` and `>> BBB` TO `AAA<<` and `>>BBB` for input text match
    // this will happen before replace, it modified `from` string and `original` string
    // this will split matcher to 2 type
    dontTrimTag?: boolean;

    // the passage name, only use in passage match mode
    // example:
    //      a mark:                `:: Start2 [nosave exitCheckBypass]`
    //      its massage name:         `Start2`
    passageName?: string;
    pN?: string;

    fileName?: string;
    js?: boolean;
    css?: boolean;
}

interface RRRRR {
    TypeBOutputText: TTTT[];
    TypeBInputStoryScript: TTTT[];
}

;(async () => {
    console.log('process.argv.length', process.argv.length);
    console.log('process.argv', process.argv);
    const jsonPath = process.argv[2];
    console.log('jsonPath', jsonPath);
    if (!jsonPath) {
        console.error('no jsonPath');
        return;
    }
    const jsonF = await promisify(fs.readFile)(jsonPath, {encoding: 'utf-8'});
    const data: any = JSON.parse(jsonF);
    console.log(jsonF.length);
    // console.log(Object.keys(data));

    const rr: RRRRR = {
        TypeBOutputText: [],
        TypeBInputStoryScript: [],
    };

    if (true) {
        const tList: TTTT[] = data;
        tList.forEach(T => {
            {
                if (has(T, 'passage') && isString(get(T, 'passage'))) {
                    T.pN = get(T, 'passage');
                    delete (T as any).passage;
                }
                if (has(T, 'original') && isString(get(T, 'original'))) {
                    T.f = get(T, 'original');
                    delete (T as any).original;
                }
                if (has(T, 'translation') && isString(get(T, 'translation'))) {
                    T.t = get(T, 'translation');
                    delete (T as any).translation;
                }
            }
            {
                const fPath = get(T, 'filepath');
                if (isString(fPath)) {
                    const fileName = path.basename(fPath);
                    const extName = path.extname(fPath).toLowerCase();
                    T.fileName = fileName;
                    switch (extName) {
                        case '.js':
                            T.js = true;
                            break;
                        case '.css':
                            T.css = true;
                            break;
                        default:
                            // ignore
                            break;
                    }
                    delete (T as any).filepath;
                }
            }
            {
                delete (T as any).key;
            }
            const f = T.from || T.f;
            const t = T.to || T.t;
            if (f && t) {
                const passageName = T.passageName || T.pN;
                if (passageName) {
                    rr.TypeBInputStoryScript.push(T);
                    return;
                }
                rr.TypeBOutputText.push(T);
                return;
            } else {
                // ignore
            }
        });
    }


    console.log('TypeBInputStoryScript', Array.from(rr.TypeBInputStoryScript).slice(0, 2));
    console.log('TypeBOutputText', Array.from(rr.TypeBOutputText).slice(0, 2));
    console.log('TypeBInputStoryScript', rr.TypeBInputStoryScript.length);
    console.log('TypeBOutputText', rr.TypeBOutputText.length);
    const objString = JSON.stringify({typeB: rr}, undefined, ' ');

    await promisify(fs.writeFile)(jsonPath + '.wash.json', objString, {encoding: 'utf-8'});

})().catch((e) => {
    console.error(e);
});




